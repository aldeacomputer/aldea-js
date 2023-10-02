import {WasmInstance as Module} from "./wasm-instance.js";
import {Pointer} from "@aldea/core";
import {TypeNode, ObjectNode} from "@aldea/core/abi";

export class Internref {
  ptr: number;

  constructor(_name: string, ptr: number) {
    this.ptr = ptr
  }

  equals(another: Internref) {
    return this.ptr === another.ptr;
  }
}

export class Externref {
  name: string;
  originBuf: Uint8Array;

  constructor(name: string, origin: Uint8Array) {
    this.name = name
    this.originBuf = origin
  }

  get origin (): Pointer {
    return Pointer.fromBytes(this.originBuf)
  }
}

/**
 * Union type for any typed array
 */
export type AnyTypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | BigInt64Array | BigUint64Array | Float32Array | Float64Array

/**
 * Memory layout interface
 */
export interface MemoryLayout {
  [field: string]: {
    align: 0 | 1 | 2 | 3;
    offset: number;
  }
}


export function liftBuffer(mod: Module, ptr: number): Uint8Array {
  return new Uint8Array(mod.memory.buffer.slice(ptr, ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2]));
}

export function getTypedArrayConstructor(type: TypeNode) {
  switch (type.name) {
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

export function getTypedArrayForPtr(type: TypeNode) {
  switch (type.name) {
    case 'bool':
      return Uint8Array
    case 'i8':
      return Int8Array
    case 'i16':
      return Int16Array
    case 'i32':
      return Int32Array
    case 'i64':
      return BigInt64Array
    case 'f32':
      return Float32Array
    case 'f64':
      return Float64Array
    case 'u8':
      return Uint8Array
    case 'u16':
      return Uint16Array
    case 'u32':
      return Uint32Array
    case 'u64':
      return BigUint64Array
    default:
      return Uint32Array
  }
}



export function getTypeBytes(type: TypeNode): number {
  switch (type.name) {
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

export function getElementBytes(type: TypeNode): number {
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
