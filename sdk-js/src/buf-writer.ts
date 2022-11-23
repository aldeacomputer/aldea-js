import { Serializable } from './internal.js'
import { Endian, isLE } from './support/endian.js'

/**
 * BufWriter is a class used for encoding structured objects into binary data.
 */
export class BufWriter {
  buffers: WriteableBuffer[];
  byteLength: number;

  constructor(buffers: WriteableBuffer[] = []) {
    this.buffers = buffers
    this.byteLength = buffers.reduce((sum, b) => sum + b.data.byteLength, 0)
  }

  get data(): Uint8Array {
    const data = new Uint8Array(this.byteLength)
    let offset = 0

    for (let i = 0; i < this.buffers.length; i++) {
      const buf = this.buffers[i]
      data.set(buf.data, offset)
      offset += buf.data.length
    }

    return data
  }

  private add(bytes: number): WriteableBuffer {
    const buffer = createWritableBuffer(bytes)
    this.buffers.push(buffer)
    this.byteLength += bytes
    return buffer
  }

  write<T>(serializer: Serializable<T>, item: T): BufWriter {
    return serializer.write(this, item)
  }

  writeBytes(data: Uint8Array): BufWriter {
    this.add(data.byteLength).data.set(data, 0)
    return this
  }

  writeF32(num: number, endian?: Endian): BufWriter {
    this.add(4).view.setFloat32(0, num, isLE(endian))
    return this
  }

  writeF64(num: number, endian?: Endian): BufWriter {
    this.add(8).view.setFloat64(0, num, isLE(endian))
    return this
  }

  writeI8(int: number): BufWriter {
    this.add(1).view.setInt8(0, int)
    return this
  }

  writeI16(int: number, endian?: Endian): BufWriter {
    this.add(2).view.setInt16(0, int, isLE(endian))
    return this
  }

  writeI32(int: number, endian?: Endian): BufWriter {
    this.add(4).view.setInt32(0, int, isLE(endian))
    return this
  }

  writeI64(int: bigint, endian?: Endian): BufWriter {
    this.add(8).view.setBigInt64(0, int, isLE(endian))
    return this
  }

  writeU8(int: number): BufWriter {
    this.add(1).view.setUint8(0, int)
    return this
  }

  writeU16(int: number, endian?: Endian): BufWriter {
    this.add(2).view.setUint16(0, int, isLE(endian))
    return this
  }

  writeU32(int: number, endian?: Endian): BufWriter {
    this.add(4).view.setUint32(0, int, isLE(endian))
    return this
  }

  writeU64(int: bigint, endian?: Endian): BufWriter {
    this.add(8).view.setBigUint64(0, int, isLE(endian))
    return this
  }

  writeVarInt(int: number | bigint): BufWriter {
    let buf: WriteableBuffer
    switch (true) {
      case int >= 0x100000000:
        buf = this.add(9)
        buf.view.setUint8(0, 255)
        buf.view.setBigUint64(1, int as bigint, true)
      case int >= 0x10000:
        buf = this.add(5)
        buf.view.setUint8(0, 254)
        buf.view.setUint32(1, int as number, true)
      case int >= 253:
        buf = this.add(3)
        buf.view.setUint8(0, 253)
        buf.view.setUint16(1, int as number, true)
      default:
        this.writeU8(int as number)
    }
    return this
  }
}

/**
 * Writable Buffer interface.
 */
interface WriteableBuffer {
  data: Uint8Array;
  view: DataView;
}

// Creates and returns a new Writable Buffer.
function createWritableBuffer(bytes: number): WriteableBuffer {
  const data = new Uint8Array(bytes)
  const view = new DataView(data.buffer)
  return { data, view }
}
