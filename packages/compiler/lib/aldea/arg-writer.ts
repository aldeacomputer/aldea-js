/**
 * ArgWriter class
 * 
 * Creates a buffer of a given length and can then sequentially can write values
 * of different types to the buffer.
 * 
 * Used to pass an arbitrary length list integers and pointers to the Vm.
 */
export class __ArgWriter {
  buffer: ArrayBuffer;
  view: DataView;
  cursor: i32;

  constructor(length: i32) {
    const buffer = new ArrayBuffer(length)
    this.buffer = buffer
    this.view = new DataView(buffer)
    this.cursor = 0
  }

  writeF32(val: f32): __ArgWriter {
    this.view.setFloat32(this.cursor, val, true)
    this.cursor += 4
    return this
  }

  writeF64(val: f64): __ArgWriter {
    this.view.setFloat64(this.cursor, val, true)
    this.cursor += 8
    return this
  }

  writeI8(val: i8): __ArgWriter {
    this.view.setInt8(this.cursor, val)
    this.cursor += 1
    return this
  }

  writeI16(val: i16): __ArgWriter {
    this.view.setInt16(this.cursor, val, true)
    this.cursor += 2
    return this
  }

  writeI32(val: i32): __ArgWriter {
    this.view.setInt32(this.cursor, val, true)
    this.cursor += 4
    return this
  }

  writeI64(val: i64): __ArgWriter {
    this.view.setInt64(this.cursor, val, true)
    this.cursor += 8
    return this
  }

  writeU8(val: u8): __ArgWriter {
    this.view.setUint8(this.cursor, val)
    this.cursor += 1
    return this
  }

  writeU16(val: u16): __ArgWriter {
    this.view.setUint16(this.cursor, val, true)
    this.cursor += 2
    return this
  }

  writeU32(val: u32): __ArgWriter {
    this.view.setUint32(this.cursor, val, true)
    this.cursor += 4
    return this
  }

  writeU64(val: u64): __ArgWriter {
    this.view.setUint64(this.cursor, val, true)
    this.cursor += 8
    return this
  }
}
