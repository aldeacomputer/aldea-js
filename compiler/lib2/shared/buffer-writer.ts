import { ResizableBuffer } from "./resizable-buffer"

export class BufferWriter {
  buffer: ResizableBuffer;
  index: i32;

  constructor(
    buffer: ResizableBuffer = new ResizableBuffer(512),
    start: i32 = 0
  ) {
    this.buffer = buffer
    this.index = start
  }

  private ensure(size: i32): ResizableBuffer {
    return this.buffer.get(size + this.index)
  }

  writeBytes(bytes: Uint8Array): BufferWriter {
    this.ensure(bytes.length).data.set(bytes, this.index)
    this.index += bytes.length
    return this
  }

  writeF32(val: f32): BufferWriter {
    this.ensure(4).view.setFloat32(this.index, val)
    this.index += 4
    return this
  }

  writeF64(val: f64): BufferWriter {
    this.ensure(8).view.setFloat64(this.index, val)
    this.index += 8
    return this
  }

  writeI8(val: i8): BufferWriter {
    this.ensure(1).view.setInt8(this.index, val)
    this.index += 1
    return this
  }

  writeI16(val: i16): BufferWriter {
    this.ensure(2).view.setInt16(this.index, val)
    this.index += 2
    return this
  }

  writeI32(val: i32): BufferWriter {
    this.ensure(4).view.setInt32(this.index, val)
    this.index += 4
    return this
  }

  writeI64(val: i64): BufferWriter {
    this.ensure(8).view.setInt64(this.index, val)
    this.index += 8
    return this
  }

  writeU8(val: u8): BufferWriter {
    this.ensure(1).view.setUint8(this.index, val)
    this.index += 1
    return this
  }

  writeU16(val: u16): BufferWriter {
    this.ensure(2).view.setUint16(this.index, val)
    this.index += 2
    return this
  }

  writeU32(val: u32): BufferWriter {
    this.ensure(4).view.setUint32(this.index, val)
    this.index += 4
    return this
  }

  writeU64(val: u64): BufferWriter {
    this.ensure(8).view.setUint64(this.index, val)
    this.index += 8
    return this
  }

  toBytes(): Uint8Array {
    return this.buffer.trim(this.index).data
  }
}
