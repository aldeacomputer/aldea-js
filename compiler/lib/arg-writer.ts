/**
 * ArgWriter class
 * 
 * Creates a buffer of a given length and can then sequentially can write values
 * of different types to the buffer.
 * 
 * Used to pass an arbitrary length list integers and pointers to the VM.
 */
export class ArgWriter {
  buffer: ArrayBuffer;
  view: DataView;
  cursor: i32;

  constructor(length: i32) {
    this.buffer = new ArrayBuffer(length)
    this.view = new DataView(this.buffer)
    this.cursor = 0
  }

  writeF32(val: f32): ArgWriter {
    this.view.setFloat32(this.cursor, val)
    this.cursor += 4
    return this
  }

  writeF64(val: f64): ArgWriter {
    this.view.setFloat64(this.cursor, val)
    this.cursor += 8
    return this
  }

  writeI8(val: i8): ArgWriter {
    this.view.setInt8(this.cursor, val)
    this.cursor += 1
    return this
  }

  writeI16(val: i16): ArgWriter {
    this.view.setInt16(this.cursor, val)
    this.cursor += 2
    return this
  }

  writeI32(val: i32): ArgWriter {
    this.view.setInt32(this.cursor, val)
    this.cursor += 4
    return this
  }

  writeI64(val: i64): ArgWriter {
    this.view.setInt64(this.cursor, val)
    this.cursor += 8
    return this
  }

  writeU8(val: u8): ArgWriter {
    this.view.setUint8(this.cursor, val)
    this.cursor += 1
    return this
  }

  writeU16(val: u16): ArgWriter {
    this.view.setUint16(this.cursor, val)
    this.cursor += 2
    return this
  }

  writeU32(val: u32): ArgWriter {
    this.view.setUint32(this.cursor, val)
    this.cursor += 4
    return this
  }

  writeU64(val: u64): ArgWriter {
    this.view.setUint64(this.cursor, val)
    this.cursor += 8
    return this
  }
}
