import { Serializable } from '../internal.js'
import { ulebEncode } from './uleb.js'

/**
 * BufWriter init options.
 */
export interface BufWriterOpts {
  size?: number;
  maxSize?: number;
}

/**
 * BufWriter sequence callback.
 */
export type BufWriterSeqCallback<T> = (writer: BufWriter, el: T, i: number, len: number) => void

/**
 * BufWriter.
 * 
 * Class used for writing BCS data chunk by chunk. Normally this is used via
 * the BCS wrapper, but can also be used as a general purpose Buffer writer.
 */
export class BufWriter {
  private cursor: number = 0;
  private size: number;
  private chunkSize: number;
  private maxSize: number;
  private view: DataView;

  constructor({ size = 1024, maxSize }: BufWriterOpts = {}) {
    this.size = size
    this.chunkSize = size
    this.maxSize = maxSize || size * 64
    this.view = new DataView(new ArrayBuffer(this.size))
  }

  get data(): Uint8Array {
    return this.toBytes()
  }

  writeBool(val: boolean): BufWriter {
    return this.writeU8(val ? 1 : 0)
  }

  writeF32(val: number): BufWriter {
    return this.push(4, (view, cursor) => view.setFloat32(cursor, val, true))
  }

  writeF64(val: number): BufWriter {
    return this.push(8, (view, cursor) => view.setFloat64(cursor, val, true))
  }

  writeI8(val: number | bigint): BufWriter {
    return this.push(1, (view, cursor) => view.setInt8(cursor, Number(val)))
  }

  writeI16(val: number | bigint): BufWriter {
    return this.push(2, (view, cursor) => view.setInt16(cursor, Number(val), true))
  }

  writeI32(val: number | bigint): BufWriter {
    return this.push(4, (view, cursor) => view.setInt32(cursor, Number(val), true))
  }

  writeI64(val: number | bigint): BufWriter {
    return this.push(8, (view, cursor) => view.setBigInt64(cursor, BigInt(val), true))
  }

  writeU8(val: number | bigint): BufWriter {
    return this.push(1, (view, cursor) => view.setUint8(cursor, Number(val)))
  }

  writeU16(val: number | bigint): BufWriter {
    return this.push(2, (view, cursor) => view.setUint16(cursor, Number(val), true))
  }

  writeU32(val: number | bigint): BufWriter {
    return this.push(4, (view, cursor) => view.setUint32(cursor, Number(val), true))
  }

  writeU64(val: number | bigint): BufWriter {
    return this.push(8, (view, cursor) => view.setBigUint64(cursor, BigInt(val), true))
  }

  writeULEB(val: number): BufWriter {
    ulebEncode(val).forEach((el) => this.writeU8(el))
    return this
  }

  writeFixedBytes(val: Uint8Array): BufWriter {
    return this.push(val.length, (view, cursor) => new Uint8Array(view.buffer).set(val, cursor))
  }

  writeBytes(val: Uint8Array): BufWriter {
    this.writeULEB(val.length)
    return this.writeFixedBytes(val)
  }

  writeFixedSeq<T>(seq: T[], cb: BufWriterSeqCallback<T>): BufWriter {
    for (let i = 0; i < seq.length; i++) {
      cb(this, seq[i], i, seq.length)
    }
    return this
  }

  writeSeq<T>(seq: T[], cb: BufWriterSeqCallback<T>): BufWriter {
    this.writeULEB(seq.length)
    return this.writeFixedSeq(seq, cb)
  }

  write<T>(serializer: Serializable<T>, item: T): BufWriter {
    return serializer.write(this, item)
  }

  // Retained in case we prefer to use varints over uleb in future
  _writeVarInt(int: number | bigint): BufWriter {
    switch (true) {
      case int >= 0x100000000:
        this.writeU8(255)
        this.writeU64(int)
        break
      case int >= 0x10000:
        this.writeU8(254)
        this.writeU32(int)
        break
      case int >= 253:
        this.writeU8(253)
        this.writeU16(int)
        break
      default:
        this.writeU8(int)
    }
    return this
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.view.buffer.slice(0, this.cursor))
  }

  private push(bytes: number, cb: (view: DataView, cursor: number) => any): BufWriter {
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
