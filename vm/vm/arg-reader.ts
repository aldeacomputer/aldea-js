import { TypeNode } from "@aldea/compiler/abi";

/**
 * ArgReader class
 *
 * Sequentially reads values of different types from an ArrayBuffer.
 * Used to receive an arbitrary length list integers and pointers from WASM.
 */
export class ArgReader {
  buffer: ArrayBuffer;
  view: DataView;
  cursor: number;

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer
    this.view = new DataView(this.buffer)
    this.cursor = 0
  }

  readF32(): number {
    const val = this.view.getFloat32(this.cursor)
    this.cursor += 4
    return val
  }

  readF64(): number {
    const val = this.view.getFloat64(this.cursor)
    this.cursor += 8
    return val
  }

  readI8(): number {
    const val = this.view.getInt8(this.cursor)
    this.cursor += 1
    return val
  }

  readI16(): number {
    const val = this.view.getInt16(this.cursor)
    this.cursor += 2
    return val
  }

  readI32(): number {
    const val = this.view.getInt32(this.cursor)
    this.cursor += 4
    return val
  }

  readI64(): bigint {
    const val = this.view.getBigInt64(this.cursor)
    this.cursor += 8
    return val
  }

  readU8(): number {
    const val = this.view.getUint8(this.cursor)
    this.cursor += 1
    return val
  }

  readU16(): number {
    const val = this.view.getUint16(this.cursor)
    this.cursor += 2
    return val
  }

  readU32(): number {
    const val = this.view.getUint32(this.cursor)
    this.cursor += 4
    return val
  }

  readU64(): bigint {
    const val = this.view.getBigUint64(this.cursor)
    this.cursor += 8
    return val
  }
}

/**
 * Reads and returns a value of the specified type from the given ArgReader.
 */
export function readType(reader: ArgReader, type: TypeNode): number | bigint {
  switch (type.name) {
    case 'f32': return reader.readF32()
    case 'f64': return reader.readF64()
    case 'i8': return reader.readI8()
    case 'i16': return reader.readI16()
    case 'i32': return reader.readI32()
    case 'i64': return reader.readI64()
    case 'u8': return reader.readU8()
    case 'u16': return reader.readU16()
    case 'u32': return reader.readU32()
    case 'u64': return reader.readU64()
    default:
      return reader.readU32()
  }
}
