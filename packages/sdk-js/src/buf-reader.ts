import { Serializable } from './internal.js'
import { Endian, isLE } from './support/endian.js'

/**
 * BufReader is a class used for decoding binary data into structured objects.
 */
export class BufReader {
  view: DataView;
  cursor: number;

  constructor(data: ArrayBuffer | Uint8Array) {
    this.view = ArrayBuffer.isView(data) ?
      new DataView(data.buffer, data.byteOffset, data.byteLength) :
      new DataView(data)
    this.cursor = 0
  }

  get remaining(): number {
    return this.view.byteLength - this.cursor
  }

  read<T>(serializer: Serializable<T>): T {
    return serializer.read(this)
  }

  readBytes(bytes: number): Uint8Array {
    this.validate(bytes)
    const start = this.view.byteOffset + this.cursor
    this.cursor += bytes
    return new Uint8Array(this.view.buffer, start, bytes)
  }

  readF32(endian?: Endian): number {
    this.validate(4)
    const num = this.view.getFloat32(this.cursor, isLE(endian))
    this.cursor += 4
    return num
  }

  readF64(endian?: Endian): number {
    this.validate(8)
    const num = this.view.getFloat64(this.cursor, isLE(endian))
    this.cursor += 8
    return num
  }

  readI8(): number {
    this.validate(1)
    const int = this.view.getInt8(this.cursor)
    this.cursor += 1
    return int
  }

  readI16(endian?: Endian): number {
    this.validate(2)
    const int = this.view.getInt16(this.cursor, isLE(endian))
    this.cursor += 2
    return int
  }

  readI32(endian?: Endian): number {
    this.validate(4)
    const int = this.view.getInt32(this.cursor, isLE(endian))
    this.cursor += 4
    return int
  }

  readI64(endian?: Endian): bigint {
    this.validate(8)
    const int = this.view.getBigInt64(this.cursor, isLE(endian))
    this.cursor += 8
    return int
  }

  readU8(): number {
    this.validate(1)
    const int = this.view.getUint8(this.cursor)
    this.cursor += 1
    return int
  }

  readU16(endian?: Endian): number {
    this.validate(2)
    const int = this.view.getUint16(this.cursor, isLE(endian))
    this.cursor += 2
    return int
  }

  readU32(endian?: Endian): number {
    this.validate(4)
    const int = this.view.getUint32(this.cursor, isLE(endian))
    this.cursor += 4
    return int
  }

  readU64(endian?: Endian): bigint {
    this.validate(8)
    const int = this.view.getBigUint64(this.cursor, isLE(endian))
    this.cursor += 8
    return int
  }

  readVarInt(): number | bigint {
    const prefix = this.readU8()
    switch (prefix) {
      case 255: return this.readU64()
      case 254: return this.readU32()
      case 253: return this.readU16()
      default: return prefix
    }
  }

  private validate(bytes: number): void {
    if (bytes > this.remaining) {
      throw new Error('buffer overflow error. not enough data')
    }
  }
}

