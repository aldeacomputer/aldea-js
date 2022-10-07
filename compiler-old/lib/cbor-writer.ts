import { BufferWriter } from "./buffer-writer";

export class CborWriter extends BufferWriter {
  encode<T>(val: T): CborWriter {
    if      (isInteger(val))  { this.encodeInt(val) }
    else if (isFloat(val))    { this.encodeFloat<T>(val) }
    else if (isString(val))   { this.encodeStr(val as string) }
    else if (isArray(val))    { this.encodeArr(val) }
    return this
  }

  encodeInt(val: isize): CborWriter {
    if (val >= 0) {
      return this.writeHead(0, val)
    } else {
      return this.writeHead(1, -(val + 1))
    }
  }

  encodeFloat<T>(val: T): CborWriter {
    if (nameof(val) === 'f32') {
      return this.writeU8((7 << 5) | 26).writeF32(val as f32)
    } else if (nameof(val) === 'f64') {
      return this.writeU8((7 << 5) | 27).writeF64(val as f64)
    } else {
      throw new Error('invalid value. not float')
    }
  }

  encodeBuf(val: Uint8Array): CborWriter {
    this.writeHead(2, val.length).push(val)
    return this
  }

  encodeStr(val: string): CborWriter {
    const buf = Uint8Array.wrap(String.UTF8.encode(val))
    this.writeHead(3, buf.length).push(buf)
    return this
  }

  encodeRef<T>(val: T): CborWriter {
    const ref = changetype<u32>(val)
    return this.writeHead(6, 42).encodeInt(ref)
  }

  encodeExtRef(location: string, ref: u32): CborWriter {
    return this.writeHead(6, 43).encodeStr(location).encodeInt(ref)
  }

  encodeArr<T>(val: ArrayLike<T>): CborWriter {
    this.writeHead(4, val.length)
    for (let i = 0; i < val.length; i++) {
      this.encode<T>(val[i])
    }
    return this
  }

  encodeMap<K, V>(val: Map<K, V>): CborWriter {
    this.writeHead(5, val.size)
    const keys = val.keys()
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      this.encode<K>(key)
      this.encode<V>(val.get(key))
    }
    return this
  }

  writeHead(type: u8, val: usize): CborWriter {
    if (val < 24) {
      this.writeU8((type << 5) | val as u8)
    } else if (val <= 0xFF) {
      this.writeU8((type << 5) | 24).writeU8(val as u8)
    } else if (val <= 0xFFFF) {
      this.writeU8((type << 5) | 25).writeU16(val as u16)
    } else if (val <= 0xFFFFFFFF) {
      this.writeU8((type << 5) | 26).writeU32(val as u32)
    } else {
      this.writeU8((type << 5) | 27).writeU64(val as u64)
    }
    return this
  }

  writeU8(num: u8): CborWriter {
    const buf = new ArrayBuffer(1)
    new DataView(buf).setUint8(0, num)
    this.push(Uint8Array.wrap(buf))
    return this
  }

  writeU16(num: u16): CborWriter {
    const buf = new ArrayBuffer(2)
    new DataView(buf).setUint16(0, num)
    this.push(Uint8Array.wrap(buf))
    return this
  }

  writeU32(num: u32): CborWriter {
    const buf = new ArrayBuffer(4)
    new DataView(buf).setUint32(0, num)
    this.push(Uint8Array.wrap(buf))
    return this
  }

  writeU64(num: u64): CborWriter {
    const buf = new ArrayBuffer(8)
    new DataView(buf).setUint64(0, num)
    this.push(Uint8Array.wrap(buf))
    return this
  }

  writeF32(num: f32): CborWriter {
    const buf = new ArrayBuffer(4)
    new DataView(buf).setFloat32(0, num)
    this.push(Uint8Array.wrap(buf))
    return this
  }

  writeF64(num: f64): CborWriter {
    const buf = new ArrayBuffer(8)
    new DataView(buf).setFloat64(0, num)
    this.push(Uint8Array.wrap(buf))
    return this
  }
}