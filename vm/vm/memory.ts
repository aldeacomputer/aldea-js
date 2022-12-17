export class Internref {
  name: string;
  ptr: number;

  constructor(name: string, ptr: number) {
    this.name = name
    this.ptr = ptr
  }

  equals(another: Internref) {
    return this.name === another.name && this.ptr === another.ptr;
  }
}

export class Externref {
  name: string;
  originBuf: Uint8Array;

  constructor(name: string, origin: Uint8Array) {
    this.name = name
    this.originBuf = origin
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
