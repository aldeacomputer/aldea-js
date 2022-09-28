import { ObjectNode, TypeNode } from '../abi/types.js';
import { allImportedObjects } from '../abi/query.js';
import { Module } from './module.js'

/**
 * Creates a finalization registry
 */
export function createRegistry(mod: Module): FinalizationRegistry<number> {
  return new FinalizationRegistry((ptr: number) => release(mod, ptr))
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
    case 'Uint8Array':
    case 'Uint16Array':
    case 'Uint32Array':
    case 'BigInt64Array':
    case 'BigUint64Array':
    case 'Float32Array':
    case 'Float64Array':
      return liftTypedArray(mod, type, val as number >>> 0)
    default:
      throw new Error(`cannot lift unspported type: ${type.name}`)
  }
}

/**
 * Casts the Ptr as an Internref and adds it to the module registry.
 */
 export function liftInternref(mod: Module, ptr: number): Internref {
  const sentinel = new Internref(retain(mod, ptr))
  mod.registry.register(sentinel, ptr)
  return sentinel
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
 * Lifts a TypedArray from WASM memory at the given Ptr.
 */
export function liftTypedArray(mod: Module, type: TypeNode, ptr: number): AnyTypedArray {
  const memU32 = new Uint32Array(mod.memory.buffer);
  const TypedArray = getTypeBufConstructor(type)
  return new TypedArray(
    mod.memory.buffer,
    memU32[ptr + 4 >>> 2],
    memU32[ptr + 8 >>> 2] / TypedArray.BYTES_PER_ELEMENT
  ).slice();
}

/**
 * Lowers any supported type into WASM memory and returns the value or Ptr.
 */
export function lowerValue(mod: Module, type: TypeNode | null, val: any): number {
  if (!type || type.name === 'void' || val === null) return 0;

  if (allImportedObjects(mod.abi).map(obj => obj.name).includes(type.name)) {
    return retain(mod, lowerImportedObject(mod, type, val))
  }

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
    case 'u64':
      return val || 0n
    case 'bool':
      return val ? 1 : 0
    case 'string':
      return lowerString(mod, val)
    case 'ArrayBuffer':
      return retain(mod, lowerBuffer(mod, val))
    case 'Int8Array':
    case 'Int16Array':
    case 'Int32Array':
    case 'Uint8Array':
    case 'Uint16Array':
    case 'Uint32Array':
    case 'BigInt64Array':
    case 'BigUint64Array':
    case 'Float32Array':
    case 'Float64Array':
      return retain(mod, lowerTypedArray(mod, type, val))
    default:
      throw new Error(`cannot lower unspported type: ${type.name}`)
  }
}

/**
 * Casts the Internref as its number value.
 */
 export function lowerInternref(ptr: Internref): number {
  if (ptr == null) return 0;
  if (ptr instanceof Internref) return ptr.valueOf();
  throw TypeError("internref expected");
}

/**
 * Lowers an ArrayBuffer into WASM memory and returns the Ptr.
 */
export function lowerBuffer(mod: Module, val: ArrayBuffer): number {
  const ptr = mod.exports.__new(val.byteLength, 0) >>> 0;
  new Uint8Array(mod.memory.buffer).set(new Uint8Array(val), ptr);
  return ptr;
}

/**
 * Lowers a complex object into WASM memory and returns the Ptr.
 */
export function lowerObject(mod: Module, obj: ObjectNode, vals: any[]): number {
  if (obj.fields.length !== vals.length) {
    throw new Error(`invalid state for ${obj.name}`)
  }

  const rtid = mod.abi.rtids[obj.name]
  const bytes = obj.fields.reduce((sum, n) => sum + getTypeBytes(n.type), 0)
  const ptr = mod.exports.__new(bytes, rtid) >>> 0
  const offsets = getObjectMemLayout(obj)

  obj.fields.forEach((n, i) => {
    const TypedArray = getTypeBufConstructor(n.type)
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
export function lowerImportedObject(mod: Module, type: TypeNode, val: ArrayBuffer): number {
  const rtid = mod.abi.rtids[type.name]
  const buffer = lowerBuffer(mod, val)

  const ptr = mod.exports.__new(val.byteLength, 0) >>> 0;
  const memU32 = new Uint32Array(mod.memory.buffer)
  memU32[ptr + 0 >>> 2] = buffer
  return ptr
}

/**
 * Lowers a string into WASM memory and returns the Ptr.
 */
export function lowerString(mod: Module, val: string): number {
  const ptr = mod.exports.__new(val.length << 1, 1) >>> 0
  const memU16 = new Uint16Array(mod.memory.buffer);
  for (let i = 0; i < val.length; ++i) {
    memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
  }
  return ptr
}

/**
 * Lowers a TypedArray into WASM memory and returns the Ptr.
 */
export function lowerTypedArray(mod: Module, type: TypeNode, val: ArrayLike<number> & ArrayLike<bigint>): number {
  const rtid = mod.abi.rtids[type.name]
  const elBytes = getTypeBytes(type)
  const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0

  const buffer = mod.exports.__pin(exports.__new(val.length << align, 0)) >>> 0
  const header = mod.exports.__new(12, rtid) >>> 0
  const memU32 = new Uint32Array(mod.memory.buffer)
  memU32[header + 0 >>> 2] = buffer
  memU32[header + 4 >>> 2] = buffer
  memU32[header + 8 >>> 2] = length << align
  const TypedArray = getTypeBufConstructor(type)
  new TypedArray(mod.memory.buffer, buffer, length).set(val)
  mod.exports.__unpin(buffer)
  return header;
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
export function getTypeBufConstructor(type: TypeNode) {
  switch(type.name) {
    case 'i8': return Int8Array
    case 'i16': return Int16Array
    case 'i32': return Int32Array
    case 'i64': return BigInt64Array
    case 'f32': return Float32Array
    case 'f64': return Float64Array
    case 'u8': return Uint8Array
    case 'u16': return Uint16Array
    case 'u32': return Uint16Array
    case 'u64': return BigUint64Array
    default:
      return Uint32Array
  }
}

// TBH, don't really know what this function does 😂
// Possibly this is relevant when using AS garbage collection
// Maybe we can get rid of the retain/release calls??
function retain(mod: Module, ptr: number) {
  if (ptr) {
    const refcount = mod.refcounts.get(ptr);
    if (refcount) { mod.refcounts.set(ptr, refcount + 1) }
    else { mod.refcounts.set(mod.exports.__pin(ptr), 1) }
  }

  return ptr;
}

// See comments about retain()
function release(mod: Module, ptr: number) {
  if (ptr) {
    const refcount = mod.refcounts.get(ptr);
    if (refcount === 1) {
      mod.exports.__unpin(ptr)
      mod.refcounts.delete(ptr)
    }
    else if (refcount) { mod.refcounts.set(ptr, refcount - 1) }
    else { throw Error(`invalid refcount '${refcount}' for reference '${ptr}'`) }
  }
}

/**
 * Internref class - wraps around a WASM Ptr
 */
export class Internref extends Number {}

/**
 * Union type for any typed array
 */
export type AnyTypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | BigInt64Array | BigUint64Array | Float32Array | Float64Array

/**
 * Memory layout interface
 */
interface MemoryLayout {
  [field: string]: {
    align: 0 | 1 | 2 | 4;
    offset: number;
  }
}
