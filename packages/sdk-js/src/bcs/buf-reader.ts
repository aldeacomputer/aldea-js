import { Serializable } from '../internal.js'
import { ulebDecode } from './uleb.js'

/**
 * BufReader sequence callback.
 */
export type BufReaderSeqCallback<T> = (reader: BufReader, i: number, len: number) => T;

/**
 * BufReader.
 * 
 * Class used for reading encoded data chunk by chunk. Normally used with the
 * BCS wrapper, but can also be used as a gerneal purpose Buffer reader.
 */
export class BufReader {
   cursor: number = 0;
   view: DataView;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  get remaining(): number {
    return this.view.byteLength - this.cursor
  }

  readBool(): boolean {
    return !!this.readU8()
  }

  readF32(): number {
    return this.pull(4, (view, cursor) => view.getFloat32(cursor, true))
  }

  readF64(): number {
    return this.pull(8, (view, cursor) => view.getFloat64(cursor, true))
  }

  readI8(): number {
    return this.pull(1, (view, cursor) => view.getInt8(cursor))
  }

  readI16(): number {
    return this.pull(2, (view, cursor) => view.getInt16(cursor, true))
  }

  readI32(): number {
    return this.pull(4, (view, cursor) => view.getInt32(cursor, true))
  }

  readI64(): bigint {
    return this.pull(8, (view, cursor) => view.getBigInt64(cursor, true))
  }

  readU8(): number {
    return this.pull(1, (view, cursor) => view.getUint8(cursor))
  }

  readU16(): number {
    return this.pull(2, (view, cursor) => view.getUint16(cursor, true))
  }

  readU32(): number {
    return this.pull(4, (view, cursor) => view.getUint32(cursor, true))
  }

  readU64(): bigint {
    return this.pull(8, (view, cursor) => view.getBigUint64(cursor, true))
  }

  readULEB(): number {
    const ulebBuf = new Uint8Array(this.view.buffer, this.view.byteOffset + this.cursor)
    const { value, length } = ulebDecode(ulebBuf)
    this.cursor += length
    return value
  }

  readFixedBytes(length: number): Uint8Array {
    return this.pull(length, (view, cursor) => {
      return new Uint8Array(view.buffer, view.byteOffset + cursor, length)
    })
  }

  readBytes(): Uint8Array {
    const length = this.readULEB()
    return this.readFixedBytes(length)
  }

  readFixedSeq<T>(length: number, cb: BufReaderSeqCallback<T>): T[] {
    const result = []
    for (let i = 0; i < length; i++) {
      result.push(cb(this, i, length))
    }
    return result
  }

  readSeq<T>(cb: BufReaderSeqCallback<T>): T[] {
    const length = this.readULEB()
    return this.readFixedSeq(length, cb)
  }

  read<T>(serializer: Serializable<T>): T {
    return serializer.read(this)
  }

  // Retained in case we prefer to use varints over uleb in future
  _readVarInt(): number | bigint {
    const prefix = this.readU8()
    switch (prefix) {
      case 255: return this.readU64()
      case 254: return this.readU32()
      case 253: return this.readU16()
      default: return prefix
    }
  }

  private pull<T>(bytes: number, cb: (view: DataView, cursor: number) => T): T {
    const val = cb(this.view, this.cursor)
    this.cursor += bytes
    return val
  }
}
