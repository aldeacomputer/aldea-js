import { blake3 } from '@noble/hashes/blake3'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import { normalizeTypeName, FieldNode, ObjectKind, ObjectNode, TypeNode } from '@aldea/compiler/abi'
import { WasmInstance as Module } from './wasm-instance.js'
import {JigRef} from "./jig-ref.js";

export class Internref {
  name: string;
  ptr: number;

  constructor(name: string, ptr: number) {
    this.name = name
    this.ptr = ptr
  }
}

export class Externref {
  name: string;
  origin: ArrayBuffer;

  constructor(name: string, origin: ArrayBuffer) {
    this.name = name
    this.origin = origin
  }
}



/**
 * Union type for any typed array
 */
export type AnyTypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | BigInt64Array | BigUint64Array | Float32Array | Float64Array

/**
 * Memory layout interface
 */
interface MemoryLayout {
  [field: string]: {
    align: 0 | 1 | 2 | 3;
    offset: number;
  }
}

/**
 * Lifts any supported type from WASM memory and returns the value.
 */
export function liftValue(mod: Module, type: TypeNode | null, val: number | bigint): any {
  if (type === null || type.name === 'void') return;

  switch(type.name) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'u8':
    case 'u16':
    case 'u32':
    case 'f32':
    case 'f64':
      return val
    case 'i64':
      return BigInt.asIntN(64, val as bigint)
    case 'u64':
      return BigInt.asUintN(64, val as bigint)
    case 'bool':
      return !!val
    case 'string':
      return liftString(mod, val as number >>> 0)
    case 'ArrayBuffer':
      return liftBuffer(mod, val as number >>> 0)
    case 'Int8Array':
    case 'Int16Array':
    case 'Int32Array':
    case 'Int64Array':
    case 'Uint8Array':
    case 'Uint16Array':
    case 'Uint32Array':
    case 'Uint64Array':
    case 'Float32Array':
    case 'Float64Array':
      return liftTypedArray(mod, type, val as number >>> 0)
    case 'Array':
      return liftArray(mod, type, val as number >>> 0)
    case 'StaticArray':
      return liftStaticArray(mod, type, val as number >>> 0)
    case 'Map':
      return liftMap(mod, type, val as number)
    case 'Set':
      return liftSet(mod, type, val as number)
    default:
      const obj = mod.abi.objects.find(n => n.name === type.name)
      if (obj) {
        switch (obj.kind) {
          case ObjectKind.EXPORTED: return liftInternref(mod, obj, val as number)
          case ObjectKind.PLAIN:    return liftObject(mod, obj, val as number)
          case ObjectKind.IMPORTED: return liftImportedObject(mod, type, val as number)
        }
      }
      throw new Error(`cannot lift unspported type: ${type.name}`)
  }
}

/**
 * Casts the Ptr as an Internref and adds it to the module registry.
 */
export function liftInternref(mod: Module, obj: ObjectNode, ptr: number): Internref {
  return new Internref(obj.name, ptr)
}

/**
 * Lifts an ArrayBuffer from WASM memory at the given Ptr.
 */
export function liftBuffer(mod: Module, ptr: number): ArrayBuffer {
  return mod.memory.buffer.slice(ptr, ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2]);
}

/**
 * Lifts a String from WASM memory at the given Ptr.
 */
export function liftString(mod: Module, ptr: number): string {
  const end = ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> 1
  const memU16 = new Uint16Array(mod.memory.buffer)
  let start = ptr >>> 1, string = "";
  while (end - start > 1024) {
    string += String.fromCharCode(...memU16.subarray(start, start += 1024))
  }
  return string + String.fromCharCode(...memU16.subarray(start, end))
}

/**
 * Lifts an Array from WASM memory at the given Ptr.
 */
export function liftArray(mod: Module, type: TypeNode, ptr: number): Array<any> {
  const memU32 = new Uint32Array(mod.memory.buffer)
  const start = memU32[ptr + 4 >>> 2]
  const length = memU32[ptr + 12 >>> 2]
  const elBytes = getTypeBytes(type.args[0])
  const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
  const TypedArray = getTypedArrayConstructor(type.args[0])
  const values = new Array(length)

  for (let i = 0; i < length; i++) {
    const nextPos = start + ((i << align) >>> 0)
    const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
    values[i] = liftValue(mod, type.args[0], nextPtr)
  }
  return values
}

/**
 * Lifts a StaticArray from WASM memory at the given Ptr.
 */
export function liftStaticArray(mod: Module, type: TypeNode, ptr: number): Array<any> {
  const elBytes = getTypeBytes(type.args[0])
  const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
  const length = new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> align
  const TypedArray = getTypedArrayConstructor(type.args[0])
  const values = new Array(length)

  for (let i = 0; i < length; ++i) {
    const nextPos = ptr + ((i << align) >>> 0)
    const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
    values[i] = liftValue(mod, type.args[0], nextPtr);
  }
  return values
}

/**
 * Lifts a TypedArray from WASM memory at the given Ptr.
 */
export function liftTypedArray(mod: Module, type: TypeNode, ptr: number): AnyTypedArray {
  const memU32 = new Uint32Array(mod.memory.buffer);
  const TypedArray = getTypedArrayConstructor(type)
  return new TypedArray(
    mod.memory.buffer,
    memU32[ptr + 4 >>> 2],
    memU32[ptr + 8 >>> 2] / TypedArray.BYTES_PER_ELEMENT
  ).slice();
}

/**
 * Lifts a Plain Object from WASM memory at the given Ptr.
 */
export function liftObject(mod: Module, obj: ObjectNode, ptr: number): any {
  const offsets = getObjectMemLayout(obj)
  return obj.fields.reduce((obj: any, n: FieldNode, _i) => {
    const TypedArray = getTypedArrayConstructor(n.type)
    const { align, offset } = offsets[n.name]
    const nextPtr = new TypedArray(mod.memory.buffer)[ptr + offset >>> align]
    obj[n.name] = liftValue(mod, n.type, nextPtr)
    return obj
  }, {})
}

/**
 * Lifts an Imported Object from WASM memory at the given Ptr.
 */
export function liftImportedObject(mod: Module, type: TypeNode, ptr: number): Externref {
  const bufPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]
  const origin = liftBuffer(mod, bufPtr)
  return new Externref(normalizeTypeName(type), origin)
}

/**
 * Lifts a Map from WASM memory at the given Ptr. 
 */
export function liftMap(mod: Module, type: TypeNode, ptr: number): Map<any, any> {
  const mem32 = new Uint32Array(mod.memory.buffer)
  const start = mem32[ptr + 8 >>> 2]
  const size  = mem32[ptr + 16 >>> 2]

  const KeyTypedArray = getTypedArrayConstructor(type.args[0])
  const kBytes = getTypeBytes(type.args[0])
  const kAlign = kBytes > 1 ? Math.ceil(kBytes / 3) : 0
  const kEntries = new KeyTypedArray(liftBuffer(mod, start))

  const ValTypedArray = getTypedArrayConstructor(type.args[1])
  const vBytes = getTypeBytes(type.args[1])
  const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
  const vEntries = new ValTypedArray(liftBuffer(mod, start))
  
  const krBytes = Math.max(kBytes, vBytes)
  const trBytes = Math.max(vBytes, 4)
  const vrBytes = kBytes === 8 && kBytes > vBytes ? trBytes : Math.max(kBytes, vBytes)
  const entrySize = Math.max(krBytes + vrBytes, 4) + trBytes

  const map = new Map()
  for (let i = 0; i < size; i++) {
    const keyPos = i * entrySize
    const valPos = keyPos + krBytes

    const keyPtr = kEntries[keyPos >>> kAlign]
    const key = liftValue(mod, type.args[0], keyPtr)

    const valPtr = vEntries[valPos >>> vAlign]
    const val = liftValue(mod, type.args[1], valPtr)

    map.set(key, val)
  }
  return map
}

/**
 * Lifts a Set from WASM memory at the given Ptr.
 */
export function liftSet(mod: Module, type: TypeNode, ptr: number): Set<any> {
  const mem32 = new Uint32Array(mod.memory.buffer)
  const start = mem32[ptr + 8 >>> 2]
  const size  = mem32[ptr + 16 >>> 2]

  const TypedArray = getTypedArrayConstructor(type.args[0])
  const vBytes = getTypeBytes(type.args[0])
  const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
  const vEntries = new TypedArray(liftBuffer(mod, start))

  const vrBytes = Math.max(vBytes, 4)
  const entrySize = vrBytes + Math.max(vrBytes, 4)

  const set = new Set()
  for (let i = 0; i < size; i++) {
    const valPos = i * entrySize
    const valPtr = vEntries[valPos >>> vAlign]
    const val = liftValue(mod, type.args[0], valPtr)

    set.add(val)
  }
  return set
}

/**
 * Lowers any supported type into WASM memory and returns the value or Ptr.
 */
export function lowerValue(mod: Module, type: TypeNode | null, val: any): number | bigint {
  if (!type || type.name === 'void' || val === null) return 0;

  switch(type.name) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'u8':
    case 'u16':
    case 'u32':
    case 'f32':
    case 'f64':
      return val
    case 'i64':
      return BigInt.asIntN(64, BigInt(val))
    case 'u64':
      return BigInt.asUintN(64, BigInt(val))
    case 'bool':
      return val ? 1 : 0
    case 'string':
      return lowerString(mod, val)
    case 'ArrayBuffer':
      return lowerBuffer(mod, val)
    case 'Int8Array':
    case 'Int16Array':
    case 'Int32Array':
    case 'Int64Array':
    case 'Uint8Array':
    case 'Uint16Array':
    case 'Uint32Array':
    case 'Uint64Array':
    case 'Float32Array':
    case 'Float64Array':
      return lowerTypedArray(mod, type, val)
    case 'Array':
      return lowerArray(mod, type, val)
    case 'StaticArray':
      return lowerStaticArray(mod, type, val)
    case 'Map':
      return lowerMap(mod, type, val)
    case 'Set':
      return lowerSet(mod, type, val)
    default:
      const obj = mod.abi.objects.find(n => n.name === type.name)
      if (obj) {
        switch (obj.kind) {
          case ObjectKind.EXPORTED: return lowerInternref(val)
          case ObjectKind.PLAIN:    return lowerObject(mod, obj, val)
          case ObjectKind.IMPORTED: return lowerImportedObject(mod, val)
        }
      }
      throw new Error(`cannot lower unspported type: ${type.name}`)
  }
}

/**
 * Casts the Internref as its number value.
 */
export function lowerInternref(ref: JigRef): number {
  return ref.ref.ptr
}

/**
 * Lowers an ArrayBuffer into WASM memory and returns the Ptr.
 */
export function lowerBuffer(mod: Module, val: ArrayBuffer): number {
  const ptr = mod.__new(val.byteLength, 0) >>> 0;
  new Uint8Array(mod.memory.buffer).set(new Uint8Array(val), ptr);
  return ptr;
}

/**
 * Lowers a string into WASM memory and returns the Ptr.
 */
export function lowerString(mod: Module, val: string): number {
  const ptr = mod.__new(val.length << 1, 1) >>> 0
  const memU16 = new Uint16Array(mod.memory.buffer);
  for (let i = 0; i < val.length; ++i) {
    memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
  }
  return ptr
}

/**
 * Lowers an Array into WASM memory and returns the Ptr.
 */
export function lowerArray(mod: Module, type: TypeNode, val: Array<any>): number {
  const rtid = mod.abi.rtids[normalizeTypeName(type)]
  const elBytes = getTypeBytes(type.args[0])
  const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
  const TypedArray = getTypedArrayConstructor(type.args[0])

  const length = val.length

  const size = val.length << align;

  const buffer = mod.__pin(mod.__new(size, 0)) >>> 0
  const header = mod.__new(16, rtid) >>> 0
  const memU32 = new Uint32Array(mod.memory.buffer)
  memU32[header + 0 >>> 2] = buffer;
  memU32[header + 4 >>> 2] = buffer;
  memU32[header + 8 >>> 2] = length << align;
  memU32[header + 12 >>> 2] = length;

  for (let i = 0; i < length; ++i) {
    const nextPos = buffer + ((i << align) >>> 0)
    const nextPtr = lowerValue(mod, type.args[0], val[i])
    new TypedArray(mod.memory.buffer)[nextPos >>> align] = nextPtr
  }
  mod.__unpin(buffer)
  mod.__unpin(header)
  return header
}

/**
 * Lowers a StaticArray into WASM memory and returns the Ptr.
 */
export function lowerStaticArray(mod: Module, type: TypeNode, val: Array<any>): number {
  const rtid = mod.abi.rtids[normalizeTypeName(type)]
  const elBytes = getTypeBytes(type.args[0])
  const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
  const TypedArray = getTypedArrayConstructor(type.args[0])

  const length = val.length
  const size = val.length << align;
  const buffer = mod.__pin(mod.__new(size, rtid)) >>> 0

  if (hasTypedArrayConstructor(type.args[0])) {
    new TypedArray(mod.memory.buffer, buffer, length).set(val)
  } else {
    for (let i = 0; i < length; i++) {
      const nextPos = buffer + ((i << align) >>> 0)
      const nextPtr = lowerValue(mod, type.args[0], val[i])
      new TypedArray(mod.memory.buffer)[nextPos >>> align] = nextPtr
    }
  }

  mod.__unpin(buffer);
  return buffer;
}

/**
 * Lowers a TypedArray into WASM memory and returns the Ptr.
 */
export function lowerTypedArray(mod: Module, type: TypeNode, val: ArrayLike<number> & ArrayLike<bigint>): number {
  const rtid = mod.abi.rtids[normalizeTypeName(type)]
  const elBytes = getTypeBytes(type)
  const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0

  const size = val.length << align;
  const buffer = mod.__pin(mod.__new(size, 0)) >>> 0
  const header = mod.__new(12, rtid) >>> 0
  const memU32 = new Uint32Array(mod.memory.buffer)
  memU32[header + 0 >>> 2] = buffer
  memU32[header + 4 >>> 2] = buffer
  memU32[header + 8 >>> 2] = length << align
  const TypedArray = getTypedArrayConstructor(type)
  new TypedArray(mod.memory.buffer, buffer, length).set(val)
  mod.__unpin(buffer)
  return header;
}

/**
 * Lowers a plain object into WASM memory and returns the Ptr.
 */
export function lowerObject(mod: Module, obj: ObjectNode, vals: any[] | any): number {
  if (!Array.isArray(vals)) { vals = Object.values(vals) }
  if (!Array.isArray(vals) || obj.fields.length !== vals.length) {
    throw new Error(`invalid state for ${obj.name}`)
  }

  const rtid = mod.abi.rtids[obj.name]
  const bytes = obj.fields.reduce((sum, n) => sum + getTypeBytes(n.type), 0)
  const ptr = mod.__new(bytes, rtid) >>> 0
  const offsets = getObjectMemLayout(obj)

  obj.fields.forEach((n, i) => {
    const TypedArray = getTypedArrayConstructor(n.type)
    const mem = new TypedArray(mod.memory.buffer, ptr, bytes)
    const { align, offset } = offsets[n.name]
    mem[offset >>> align] = lowerValue(mod, n.type, vals[i])
  })
  return ptr
}

/**
 * Lowers an imported object (setting the origin ArrayBuffer) into WASM memory
 * and returns the Ptr.
 */
export function lowerImportedObject(mod: Module, val: Externref): number {
  const buffer = lowerBuffer(mod, Buffer.from(val.origin))
  const ptr = mod.__new(val.origin.byteLength, 0);
  const memU32 = new Uint32Array(mod.memory.buffer)
  memU32[ptr >>> 2] = buffer
  return ptr
}

/**
 * Lowers a Map into WASM memory and returns the Ptr.
 * 
 * This is a bit of a hack - it creates an empty Map and then repeatedly calls
 * `__put_map_entry_SUFFIX(key, val)` to add the entries directly to the map.
 */
export function lowerMap(mod: Module, type: TypeNode, val: Map<any, any>): number {
  const kBytes = getTypeBytes(type.args[0])
  const vBytes = getTypeBytes(type.args[1])

  const krBytes = Math.max(kBytes, vBytes)
  const trBytes = Math.max(vBytes, 4)
  const vrBytes = kBytes === 8 && kBytes > vBytes ? trBytes : Math.max(kBytes, vBytes)
  const entrySize = Math.max(krBytes + vrBytes, 4) + trBytes
  const ptr = lowerEmptySetOrMap(mod, type, entrySize)

  const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
  const fnName = `__put_map_entry_${ toHex(typeHash) }`
  val.forEach((v, k) => {
    const key = lowerValue(mod, type.args[0], k) as number
    const val = lowerValue(mod, type.args[1], v) as number
    const fn = mod.exports[fnName](ptr, key, val)
  })

  return ptr
}

/**
 * Lowers a Set into WASM memory and returns the Ptr.
 * 
 * This is a bit of a hack - it creates an empty Set and then repeatedly calls
 * `__put_set_entry_SUFFIX(val)` to add the entries directly to the set.
 */
export function lowerSet(mod: Module, type: TypeNode, val: Set<any>): number {
  const bytes = Math.max(getTypeBytes(type.args[0]), 4)
  const entrySize = bytes + Math.max(bytes, 4)
  const ptr = lowerEmptySetOrMap(mod, type, entrySize)

  const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
  const fnName = `__put_set_entry_${ toHex(typeHash) }`
  val.forEach(v => {
    const entry = lowerValue(mod, type.args[0], v) as number
    mod.exports[fnName](ptr, entry)
  })

  return ptr
}

// Creates an empty Set or Map type, returning the Ptr
function lowerEmptySetOrMap(mod: Module, type: TypeNode, entrySize: number): number {
  const rtid = mod.abi.rtids[normalizeTypeName(type)]
  const initCapacity = 4
  const buckets = mod.__new(initCapacity * 4, 0)
  const entries = mod.__new(initCapacity * entrySize, 0)
  const ptr = mod.__new(24, rtid)

  const memU32 = new Uint32Array(mod.memory.buffer)
  memU32[ptr + 0 >>> 2] = buckets
  memU32[ptr + 1 >>> 2] = initCapacity - 1
  memU32[ptr + 2 >>> 2] = entries
  memU32[ptr + 3 >>> 2] = initCapacity
  memU32[ptr + 4 >>> 2] = 0
  memU32[ptr + 5 >>> 2] = 0

  return ptr
}

/**
 * Returns the memory layout of the given object.
 *
 * Is an object where each key is a field name, and its value is an object with
 * offset and align values.
 */
export function getObjectMemLayout(object: ObjectNode): MemoryLayout {
  return object.fields.reduce((obj: any, field, i, fields) => {
    const thisBytes = getTypeBytes(field.type)
    let offset = 0
    let align = 0

    if (i > 0) {
      const prevField = fields[i-1]
      const prevBytes = getTypeBytes(prevField.type)
      const prevOffset = obj[prevField.name].offset
      offset = Math.ceil((prevOffset + prevBytes) / thisBytes) * thisBytes
    }

    if (thisBytes > 1) {
      align = Math.ceil(thisBytes / 3)
    }

    obj[field.name] = { offset, align }
    return obj
  }, {})
}

/**
 * Returns the number of bytes for the given type.
 */
export function getTypeBytes(type: TypeNode): number {
  switch(type.name) {
    case 'i8':
    case 'u8':
    case 'bool':
    case 'null':
      return 1
    case 'i16':
    case 'u16':
      return 2
    case 'i64':
    case 'f64':
    case 'u64':
      return 8
    default:
      return 4
  }
}

/**
 * Returns a typed array constructor for the given type.
 */
export function getTypedArrayConstructor(type: TypeNode) {
  switch(type.name) {
    case 'i8':
    case 'Int8Array':
      return Int8Array
    case 'i16':
    case 'Int16Array':
      return Int16Array
    case 'i32':
    case 'Int32Array':
      return Int32Array
    case 'i64':
    case 'Int64Array':
      return BigInt64Array
    case 'f32':
    case 'Float32Array':
      return Float32Array
    case 'f64':
    case 'Float64Array':
      return Float64Array
    case 'u8':
    case 'Uint8Array':
      return Uint8Array
    case 'u16':
    case 'Uint16Array':
      return Uint16Array
    case 'u32':
    case 'Uint32Array':
      return Uint32Array
    case 'u64':
    case 'Uint64Array':
      return BigUint64Array
    default:
      return Uint32Array
  }
}

/**
 * Returns true if the type has TypedArray constructor
 */
export function hasTypedArrayConstructor(type: TypeNode): boolean {
  return [
    'f32', 'f64',
    'i8', 'i16', 'i32', 'i64',
    'u8', 'u16', 'u32', 'u64',
  ].includes(type.name)
}
