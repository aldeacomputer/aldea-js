import { ulebDecode } from './uleb.js'

/**
 * BCS Reader sequence callback.
 */
export type BCSReaderSeqCallback<T> = (reader: BCSReader, i: number, len: number) => T;

/**
 * BCS Reader.
 * 
 * Class used for reading BCS data chunk by chunk. Normally used with the BCS 
 * wrapper, but can also be used as a gerneal purpose Buffer reader.
 */
export class BCSReader {
  private cursor: number = 0;
  private view: DataView;

  constructor(data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  }

  readBool(): boolean {
    return !!this.readU8()
  }

  readF32(): number {
    return this.read(4, (view, cursor) => view.getFloat32(cursor, true))
  }

  readF64(): number {
    return this.read(8, (view, cursor) => view.getFloat64(cursor, true))
  }

  readI8(): number {
    return this.read(1, (view, cursor) => view.getInt8(cursor))
  }

  readI16(): number {
    return this.read(2, (view, cursor) => view.getInt16(cursor, true))
  }

  readI32(): number {
    return this.read(4, (view, cursor) => view.getInt32(cursor, true))
  }

  readI64(): bigint {
    return this.read(8, (view, cursor) => view.getBigInt64(cursor, true))
  }

  readU8(): number {
    return this.read(1, (view, cursor) => view.getUint8(cursor))
  }

  readU16(): number {
    return this.read(2, (view, cursor) => view.getUint16(cursor, true))
  }

  readU32(): number {
    return this.read(4, (view, cursor) => view.getUint32(cursor, true))
  }

  readU64(): bigint {
    return this.read(8, (view, cursor) => view.getBigUint64(cursor, true))
  }

  readULEB(): number {
    const { value, length } = ulebDecode(new Uint8Array(this.view.buffer, this.cursor))
    this.cursor += length
    return value
  }

  readFixedBytes(length: number): Uint8Array {
    return this.read(length, (view, cursor) => {
      return new Uint8Array(view.buffer, view.byteOffset + cursor, length)
    })
  }

  readBytes(): Uint8Array {
    const length = this.readULEB()
    return this.readFixedBytes(length)
  }

  readFixedSeq<T>(length: number, cb: BCSReaderSeqCallback<T>): T[] {
    const result = []
    for (let i = 0; i < length; i++) {
      result.push(cb(this, i, length))
    }
    return result
  }

  readSeq<T>(cb: BCSReaderSeqCallback<T>): T[] {
    const length = this.readULEB()
    return this.readFixedSeq(length, cb)
  }

  private read<T>(bytes: number, cb: (view: DataView, cursor: number) => T): T {
    const val = cb(this.view, this.cursor)
    this.cursor += bytes
    return val
  }
}
