import { blake3 } from '@noble/hashes/blake3'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import {
  normalizeTypeName,
  FieldNode,
  ObjectNode,
  TypeNode,
  findClass,
  findImport,
  findObject
} from '@aldea/compiler/abi'
import { WasmInstance as Module } from './wasm-instance.js'
import { JigRef } from "./jig-ref.js";
import {AnyTypedArray, Externref, Internref, MemoryLayout} from "./memory.js";


export type InternRefMap = (ref: Internref) => any
export type InternRefFilter = (origin: Uint8Array) => JigRef
export type ExternRefFilter = (ref: Externref | JigRef) => JigRef

export class MemoryManager {
  liftInterRefMap: InternRefMap
  lowerInterRefFilter: InternRefFilter | null
  extRefFilter: ExternRefFilter

  constructor() {
    this.liftInterRefMap = (ref: Internref) => ref
    this.lowerInterRefFilter = null
    this.extRefFilter = (ref: Externref | JigRef) => {
      if (ref instanceof Externref) {
        throw new Error('should be a jig ref')
      } else {
        return ref
      }
    }
  }

  reset () {
    this.liftInterRefMap = (ref: Internref) => ref
    this.lowerInterRefFilter = null
    this.extRefFilter = (ref: Externref | JigRef) => {
      if (ref instanceof Externref) {
        throw new Error('should be a jig ref')
      } else {
        return ref
      }
    }
  }

  liftValue(mod: Module, type: TypeNode | null, val: number | bigint): any {
    if (type === null || type.name === 'void') return;

    switch(type.name) {
      case 'isize':
      case 'usize':
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
        return this.liftString(mod, val as number >>> 0)
      case 'ArrayBuffer':
        return this.liftBuffer(mod, val as number >>> 0)
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
        return this.liftTypedArray(mod, type, val as number >>> 0)
      case 'Array':
        return this.liftArray(mod, type, val as number >>> 0)
      case 'StaticArray':
        return this.liftStaticArray(mod, type, val as number >>> 0)
      case 'Map':
        return this.liftMap(mod, type, val as number)
      case 'Set':
        return this.liftSet(mod, type, val as number)
      default:
        const exported = findClass(mod.abi, type.name)
        const imported = findImport(mod.abi, type.name)
        const isobject = findObject(mod.abi, type.name)

        if (exported) { return this.liftInternref(mod, exported, val as number) }
        if (imported) { return this.liftImportedObject(mod, type, val as number) }
        if (isobject) { return this.liftObject(mod, isobject, val as number) }

        throw new Error(`cannot lift unspported type: ${type.name}`)
    }
  }

  liftInternref(mod: Module, obj: ObjectNode, ptr: number): Internref {
    return this.liftInterRefMap(new Internref(obj.name, ptr))
  }

  liftBuffer(mod: Module, ptr: number): Uint8Array {
    return new Uint8Array(mod.memory.buffer.slice(ptr, ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2]));
  }

  liftString(mod: Module, ptr: number): string {
    const end = ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> 1
    const memU16 = new Uint16Array(mod.memory.buffer)
    let start = ptr >>> 1, string = "";
    while (end - start > 1024) {
      string += String.fromCharCode(...memU16.subarray(start, start += 1024))
    }
    return string + String.fromCharCode(...memU16.subarray(start, end))
  }

  liftArray(mod: Module, type: TypeNode, ptr: number): Array<any> {
    const memU32 = new Uint32Array(mod.memory.buffer)
    const start = memU32[ptr + 4 >>> 2]
    const length = memU32[ptr + 12 >>> 2]
    const elBytes = this.getTypeBytes(type.args[0])
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = this.getTypedArrayConstructor(type.args[0])
    const values = new Array(length)

    for (let i = 0; i < length; i++) {
      const nextPos = start + ((i << align) >>> 0)
      const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
      values[i] = this.liftValue(mod, type.args[0], nextPtr)
    }
    return values
  }

  liftStaticArray(mod: Module, type: TypeNode, ptr: number): Array<any> {
    const elBytes = this.getTypeBytes(type.args[0])
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const length = new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> align
    const TypedArray = this.getTypedArrayConstructor(type.args[0])
    const values = new Array(length)

    for (let i = 0; i < length; ++i) {
      const nextPos = ptr + ((i << align) >>> 0)
      const nextPtr = new TypedArray(mod.memory.buffer)[nextPos >>> align]
      values[i] = this.liftValue(mod, type.args[0], nextPtr);
    }
    return values
  }

  liftTypedArray(mod: Module, type: TypeNode, ptr: number): AnyTypedArray {
    const memU32 = new Uint32Array(mod.memory.buffer);
    const TypedArray = this.getTypedArrayConstructor(type)
    return new TypedArray(
      mod.memory.buffer,
      memU32[ptr + 4 >>> 2],
      memU32[ptr + 8 >>> 2] / TypedArray.BYTES_PER_ELEMENT
    ).slice();
  }

  liftObject(mod: Module, obj: ObjectNode, ptr: number): any {
    const offsets = this.getObjectMemLayout(obj)
    return obj.fields.reduce((obj: any, n: FieldNode, _i) => {
      const TypedArray = this.getTypedArrayConstructor(n.type)
      const { align, offset } = offsets[n.name]
      const nextPtr = new TypedArray(mod.memory.buffer)[ptr + offset >>> align]
      obj[n.name] = this.liftValue(mod, n.type, nextPtr)
      return obj
    }, {})
  }

  liftImportedObject(mod: Module, type: TypeNode, ptr: number): Externref {
    const bufPtr = new Uint32Array(mod.memory.buffer)[ptr >>> 2]
    const origin = this.liftBuffer(mod, bufPtr)
    return new Externref(normalizeTypeName(type), origin)
  }

  liftMap(mod: Module, type: TypeNode, ptr: number): Map<any, any> {
    const mem32 = new Uint32Array(mod.memory.buffer)
    const start = mem32[ptr + 8 >>> 2]
    const size  = mem32[ptr + 16 >>> 2]

    const KeyTypedArray = this.getTypedArrayConstructor(type.args[0])
    const kBytes = this.getTypeBytes(type.args[0])
    const kAlign = kBytes > 1 ? Math.ceil(kBytes / 3) : 0
    const kEntries = new KeyTypedArray(this.liftBuffer(mod, start).buffer)

    const ValTypedArray = this.getTypedArrayConstructor(type.args[1])
    const vBytes = this.getTypeBytes(type.args[1])
    const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
    const vEntries = new ValTypedArray(this.liftBuffer(mod, start).buffer)

    const krBytes = Math.max(kBytes, vBytes)
    const trBytes = Math.max(vBytes, 4)
    const vrBytes = kBytes === 8 && kBytes > vBytes ? trBytes : Math.max(kBytes, vBytes)
    const entrySize = Math.max(krBytes + vrBytes, 4) + trBytes

    const map = new Map()
    for (let i = 0; i < size; i++) {
      const keyPos = i * entrySize
      const valPos = keyPos + krBytes

      const keyPtr = kEntries[keyPos >>> kAlign]
      const key = this.liftValue(mod, type.args[0], keyPtr)

      const valPtr = vEntries[valPos >>> vAlign]
      const val = this.liftValue(mod, type.args[1], valPtr)

      map.set(key, val)
    }
    return map
  }

  liftSet(mod: Module, type: TypeNode, ptr: number): Set<any> {
    const mem32 = new Uint32Array(mod.memory.buffer)
    const start = mem32[ptr + 8 >>> 2]
    const size  = mem32[ptr + 16 >>> 2]

    const TypedArray = this.getTypedArrayConstructor(type.args[0])
    const vBytes = this.getTypeBytes(type.args[0])
    const vAlign = vBytes > 1 ? Math.ceil(vBytes / 3) : 0
    const vEntries = new TypedArray(this.liftBuffer(mod, start).buffer)

    const vrBytes = Math.max(vBytes, 4)
    const entrySize = vrBytes + Math.max(vrBytes, 4)

    const set = new Set()
    for (let i = 0; i < size; i++) {
      const valPos = i * entrySize
      const valPtr = vEntries[valPos >>> vAlign]
      const val = this.liftValue(mod, type.args[0], valPtr)

      set.add(val)
    }
    return set
  }

  lowerValue(mod: Module, type: TypeNode | null, val: any): number {
    if (!type || type.name === 'void' || val === null) return 0;

    switch(type.name) {
      case 'isize':
      case 'usize':
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
        // @ts-ignore
        return BigInt.asIntN(64, BigInt(val))
      case 'u64':
        // @ts-ignore
        return BigInt.asUintN(64, BigInt(val))
      case 'bool':
        return val ? 1 : 0
      case 'string':
        return this.lowerString(mod, val)
      case 'ArrayBuffer':
        return this.lowerBuffer(mod, val)
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
        return this.lowerTypedArray(mod, type, val)
      case 'Array':
        return this.lowerArray(mod, type, val)
      case 'StaticArray':
        return this.lowerStaticArray(mod, type, val)
      case 'Map':
        return this.lowerMap(mod, type, val)
      case 'Set':
        return this.lowerSet(mod, type, val)
      default:
        const exported = findClass(mod.abi, type.name)
        const imported = findImport(mod.abi, type.name)
        const objectNode = findObject(mod.abi, type.name)

        if (exported) {
          let interRef
          if (this.lowerInterRefFilter) {
            interRef = this.lowerInterRefFilter(val)
          } else {
            interRef = val
          }
          return this.lowerInternref(interRef)
        }
        if (imported) { return this.lowerImportedObject(mod, this.extRefFilter(val)) }
        if (objectNode) { return this.lowerObject(mod, objectNode, val) }

        throw new Error(`cannot lower unspported type: ${type.name}`)
    }
  }

  lowerInternref(ref: JigRef): number {
    return ref.ref.ptr
  }

  lowerBuffer(mod: Module, val: ArrayBuffer): number {
    const ptr = mod.__new(val.byteLength, 0) >>> 0;
    new Uint8Array(mod.memory.buffer).set(new Uint8Array(val), ptr);
    return ptr;
  }

  lowerString(mod: Module, val: string): number {
    const ptr = mod.__new(val.length << 1, 1) >>> 0
    const memU16 = new Uint16Array(mod.memory.buffer);
    for (let i = 0; i < val.length; ++i) {
      memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
    }
    return ptr
  }

  lowerArray(mod: Module, type: TypeNode, val: Array<any>): number {
    const rtid = mod.abi.typeIds[normalizeTypeName(type)]
    const elBytes = this.getTypeBytes(type.args[0])
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = this.getTypedArrayConstructor(type.args[0])

    const length = val.length
    const buffer = mod.__pin(mod.__new((length << align), 0)) >>> 0
    const header = mod.__new(16, rtid) >>> 0
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[header >>> 2] = buffer;
    memU32[header + 4 >>> 2] = buffer;
    memU32[header + 8 >>> 2] = length << align;
    memU32[header + 12 >>> 2] = length;

    for (let i = 0; i < length; ++i) {
      const nextPos = buffer + ((i << align) >>> 0)
      const nextPtr = this.lowerValue(mod, type.args[0], val[i])
      new TypedArray(mod.memory.buffer)[nextPos >>> align] = nextPtr
    }
    mod.__unpin(buffer)
    mod.__unpin(header)
    return header
  }

  lowerStaticArray(mod: Module, type: TypeNode, val: Array<any>): number {
    const rtid = mod.abi.typeIds[normalizeTypeName(type)]
    const elBytes = this.getTypeBytes(type.args[0])
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0
    const TypedArray = this.getTypedArrayConstructor(type.args[0])

    const length = val.length
    const size = val.length << align;
    const buffer = mod.__pin(mod.__new(size, rtid)) >>> 0

    if (this.hasTypedArrayConstructor(type.args[0])) {
      new TypedArray(mod.memory.buffer, buffer, length).set(val)
    } else {
      for (let i = 0; i < length; i++) {
        const nextPos = buffer + ((i << align) >>> 0)
        const nextPtr = this.lowerValue(mod, type.args[0], val[i])
        new TypedArray(mod.memory.buffer)[nextPos >>> align] = nextPtr
      }
    }

    mod.__unpin(buffer);
    return buffer;
  }

  lowerTypedArray(mod: Module, type: TypeNode, val: ArrayLike<number> & ArrayLike<bigint>): number {
    const rtid = mod.abi.typeIds[normalizeTypeName(type)]
    const elBytes = this.getElementBytes(type)
    const align = elBytes > 1 ? Math.ceil(elBytes / 3) : 0

    const length = val.length
    const buffer = mod.__pin(mod.__new((length << align), 0)) >>> 0
    const header = mod.__new(12, rtid) >>> 0
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[header >>> 2] = buffer
    memU32[header + 4 >>> 2] = buffer
    memU32[header + 8 >>> 2] = length << align
    const TypedArray = this.getTypedArrayConstructor(type)
    new TypedArray(mod.memory.buffer, buffer, length).set(val)
    mod.__unpin(buffer)
    return header;
  }

  lowerObject(mod: Module, obj: ObjectNode, vals: any[] | any): number {
    if (!Array.isArray(vals)) { vals = Object.values(vals) }
    if (!Array.isArray(vals) || obj.fields.length !== vals.length) {
      throw new Error(`invalid state for ${obj.name}`)
    }

    const rtid = mod.abi.typeIds[obj.name]
    const bytes = obj.fields.reduce((sum, n) => sum + this.getTypeBytes(n.type), 0)
    const ptr = mod.__new(bytes, rtid) >>> 0
    const offsets = this.getObjectMemLayout(obj)

    obj.fields.forEach((n, i) => {
      const TypedArray = this.getTypedArrayConstructor(n.type)
      const mem = new TypedArray(mod.memory.buffer, ptr, bytes)
      const { align, offset } = offsets[n.name]
      mem[offset >>> align] = this.lowerValue(mod, n.type, vals[i])
    })
    return ptr
  }

  lowerImportedObject(mod: Module, val: JigRef): number {
    const buf = Buffer.from(val.originBuf);
    const bufferPtr = this.lowerBuffer(mod, buf)
    const ptr = mod.__new(val.originBuf.byteLength, mod.abi.typeIds[val.className()]);
    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[ptr >>> 2] = bufferPtr
    return ptr
  }

  lowerMap(mod: Module, type: TypeNode, val: Map<any, any>): number {
    const kBytes = this.getTypeBytes(type.args[0])
    const vBytes = this.getTypeBytes(type.args[1])

    const krBytes = Math.max(kBytes, vBytes)
    const trBytes = Math.max(vBytes, 4)
    const vrBytes = kBytes === 8 && kBytes > vBytes ? trBytes : Math.max(kBytes, vBytes)
    const entrySize = Math.max(krBytes + vrBytes, 4) + trBytes
    const ptr = this.lowerEmptySetOrMap(mod, type, entrySize)

    const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
    const fnName = `__put_map_entry_${ toHex(typeHash) }`
    val.forEach((v, k) => {
      const key = this.lowerValue(mod, type.args[0], k) as number
      const val = this.lowerValue(mod, type.args[1], v) as number
      mod.exports[fnName](ptr, key, val)
    })

    return ptr
  }

  lowerSet(mod: Module, type: TypeNode, val: Set<any>): number {
    const bytes = Math.max(this.getTypeBytes(type.args[0]), 4)
    const entrySize = bytes + Math.max(bytes, 4)
    const ptr = this.lowerEmptySetOrMap(mod, type, entrySize)

    const typeHash = blake3(normalizeTypeName(type), { dkLen: 4 })
    const fnName = `__put_set_entry_${ toHex(typeHash) }`
    val.forEach(v => {
      const entry = this.lowerValue(mod, type.args[0], v) as number
      mod.exports[fnName](ptr, entry)
    })

    return ptr
  }

  getObjectMemLayout(object: ObjectNode): MemoryLayout {
    return object.fields.reduce((obj: any, field, i, fields) => {
      const thisBytes = this.getTypeBytes(field.type)
      let offset = 0
      let align = 0

      if (i > 0) {
        const prevField = fields[i-1]
        const prevBytes = this.getTypeBytes(prevField.type)
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

  private lowerEmptySetOrMap(mod: Module, type: TypeNode, entrySize: number): number {
    const rtid = mod.abi.typeIds[normalizeTypeName(type)]
    const initCapacity = 4
    const buckets = mod.__new(initCapacity * 4, 0)
    const entries = mod.__new(initCapacity * entrySize, 0)
    const ptr = mod.__new(24, rtid)

    const memU32 = new Uint32Array(mod.memory.buffer)
    memU32[ptr >>> 2] = buckets
    memU32[ptr + 1 >>> 2] = initCapacity - 1
    memU32[ptr + 2 >>> 2] = entries
    memU32[ptr + 3 >>> 2] = initCapacity
    memU32[ptr + 4 >>> 2] = 0
    memU32[ptr + 5 >>> 2] = 0

    return ptr
  }

  getTypeBytes(type: TypeNode): number {
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

  getElementBytes(type: TypeNode): number {
    switch(type.name) {
      case 'Int16Array':
      case 'Uint16Array':
        return 2;
      case 'Int32Array':
      case 'Uint32Array':
      case 'Float32Array':
        return 4;
      case 'Int64Array':
      case 'Uint64Array':
      case 'Float64Array':
        return 8;
      default:
        return 1
    }
  }

  getTypedArrayConstructor(type: TypeNode) {
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

  hasTypedArrayConstructor(type: TypeNode): boolean {
    return [
      'f32', 'f64',
      'i8', 'i16', 'i32', 'i64',
      'u8', 'u16', 'u32', 'u64',
    ].includes(type.name)
  }
}

