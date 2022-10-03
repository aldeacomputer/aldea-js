//import { ResizableBuffer } from "./resizable-buffer"
import { ConcatBuffer } from "./concat-buffer"

export class BufferWriter {
  buffer: ConcatBuffer;

  constructor() {
    this.buffer = new ConcatBuffer()
  }

  writeBytes(bytes: Uint8Array): BufferWriter {
    this.buffer.add(bytes.length).data.set(bytes, 0)
    return this
  }

  writeF32(val: f32): BufferWriter {
    this.buffer.add(4).view.setFloat32(0, val)
    return this
  }

  writeF64(val: f64): BufferWriter {
    this.buffer.add(8).view.setFloat64(0, val)
    return this
  }

  writeI8(val: i8): BufferWriter {
    this.buffer.add(1).view.setInt8(0, val)
    return this
  }

  writeI16(val: i16): BufferWriter {
    this.buffer.add(2).view.setInt16(0, val)
    return this
  }

  writeI32(val: i32): BufferWriter {
    this.buffer.add(4).view.setInt32(0, val)
    return this
  }

  writeI64(val: i64): BufferWriter {
    this.buffer.add(8).view.setInt64(0, val)
    return this
  }

  writeU8(val: u8): BufferWriter {
    this.buffer.add(1).view.setUint8(0, val)
    return this
  }

  writeU16(val: u16): BufferWriter {
    this.buffer.add(2).view.setUint16(0, val)
    return this
  }

  writeU32(val: u32): BufferWriter {
    this.buffer.add(4).view.setUint32(0, val)
    return this
  }

  writeU64(val: u64): BufferWriter {
    this.buffer.add(8).view.setUint64(0, val)
    return this
  }

  toBytes(): Uint8Array {
    return this.buffer.export()
  }
}
