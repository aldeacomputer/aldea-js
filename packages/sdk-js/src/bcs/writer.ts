import { ulebEncode } from './uleb.js'

/**
 * BCS Writer init options.
 */
export interface BCSWriterOpts {
  size?: number;
  maxSize?: number;
}

/**
 * BCS Writer sequence callback.
 */
export type BCSWriterSeqCallback<T> = (writer: BCSWriter, el: T, i: number, len: number) => void

/**
 * BCS Writer.
 * 
 * Class used for writing BCS data chunk by chunk. Normally this is used via
 * the BCS wrapper, but can also be used as a general purpose Buffer writer.
 */
export class BCSWriter {
  private cursor: number = 0;
  private size: number;
  private chunkSize: number;
  private maxSize: number;
  private view: DataView;

  constructor({ size = 1024, maxSize }: BCSWriterOpts = {}) {
    this.size = size
    this.chunkSize = size
    this.maxSize = maxSize || size * 64
    this.view = new DataView(new ArrayBuffer(this.size))
  }

  writeBool(val: boolean): BCSWriter {
    return this.writeU8(val ? 1 : 0)
  }

  writeF32(val: number): BCSWriter {
    return this.write(4, (view, cursor) => view.setFloat32(cursor, val, true))
  }

  writeF64(val: number): BCSWriter {
    return this.write(8, (view, cursor) => view.setFloat64(cursor, val, true))
  }

  writeI8(val: number | bigint): BCSWriter {
    return this.write(1, (view, cursor) => view.setInt8(cursor, Number(val)))
  }

  writeI16(val: number | bigint): BCSWriter {
    return this.write(2, (view, cursor) => view.setInt16(cursor, Number(val), true))
  }

  writeI32(val: number | bigint): BCSWriter {
    return this.write(4, (view, cursor) => view.setInt32(cursor, Number(val), true))
  }

  writeI64(val: number | bigint): BCSWriter {
    return this.write(8, (view, cursor) => view.setBigInt64(cursor, BigInt(val), true))
  }

  writeU8(val: number | bigint): BCSWriter {
    return this.write(1, (view, cursor) => view.setUint8(cursor, Number(val)))
  }

  writeU16(val: number | bigint): BCSWriter {
    return this.write(2, (view, cursor) => view.setUint16(cursor, Number(val), true))
  }

  writeU32(val: number | bigint): BCSWriter {
    return this.write(4, (view, cursor) => view.setUint32(cursor, Number(val), true))
  }

  writeU64(val: number | bigint): BCSWriter {
    return this.write(8, (view, cursor) => view.setBigUint64(cursor, BigInt(val), true))
  }

  writeULEB(val: number): BCSWriter {
    ulebEncode(val).forEach((el) => this.writeU8(el))
    return this
  }

  writeFixedBytes(val: Uint8Array): BCSWriter {
    return this.write(val.length, (view, cursor) => new Uint8Array(view.buffer).set(val, cursor))
  }

  writeBytes(val: Uint8Array): BCSWriter {
    this.writeULEB(val.length)
    return this.writeFixedBytes(val)
  }

  writeFixedSeq<T>(seq: T[], cb: BCSWriterSeqCallback<T>): BCSWriter {
    for (let i = 0; i < seq.length; i++) {
      cb(this, seq[i], i, seq.length)
    }
    return this
  }

  writeSeq<T>(seq: T[], cb: BCSWriterSeqCallback<T>): BCSWriter {
    this.writeULEB(seq.length)
    return this.writeFixedSeq(seq, cb)
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.view.buffer.slice(0, this.cursor));
  }

  private write(bytes: number, cb: (view: DataView, cursor: number) => any): BCSWriter {
    const requiredSize = this.cursor + bytes
    if (requiredSize > this.size) {
      this.expand(requiredSize)
    }
    cb(this.view, this.cursor)
    this.cursor += bytes
    return this
  }

  private expand(requiredSize: number): void {
    const chunks = Math.ceil(requiredSize / this.chunkSize)
    const nextSize = this.size + (chunks * this.chunkSize)
    if (nextSize > this.maxSize) {
      throw new Error('BCSWiter: max buffer size overflow')
    }
    this.size = nextSize
    const nextBuffer = new ArrayBuffer(this.size);
    new Uint8Array(nextBuffer).set(new Uint8Array(this.view.buffer));
    this.view = new DataView(nextBuffer);
  }
}
