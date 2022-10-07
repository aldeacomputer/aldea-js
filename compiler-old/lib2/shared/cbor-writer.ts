import { BufferWriter } from "./buffer-writer";

/**
 * Currently not supported
 * 
 * - Infinity, neg Infinity and NaN (could be if needed)
 * - Undefined (not possible in AS)
 */

export class CborWriter extends BufferWriter {
  encode<T>(val: T): BufferWriter {
    if      (isNullable(val) && val == null) { this.encodeHead(7, 22) }
    else if (nameof(val) == 'bool') { this.encodeHead(7, val ? 21 : 20) }
    else if (isInteger(val))  { this.encodeInt<T>(val) }
    else if (isFloat(val))    { this.encodeFloat(val) }
    else if (isString(val))   { this.encodeStr(val as string) }
    //else if (isArray(val))    { this.encodeArr(val) }
    else if (nameof(val) == 'ArrayBuffer') { this.encodeBuf(val as ArrayBuffer) }
    
    return this
  }

  encodeInt<T>(val: T): BufferWriter {
    if (!isInteger(val)) { throw new Error('invalid value. not integer') }

    if (val >= 0) {
      return this.encodeHead(0, val)
    } else {
      return this.encodeHead(1, -(val + 1))
    }
  }

  encodeFloat(val: f64): BufferWriter {
    return this.writeU8((7 << 5) | 27).writeF64(val)
  }

  encodeBuf(val: ArrayBuffer): BufferWriter {
    const buf = Uint8Array.wrap(val)
    return this.encodeHead(2, buf.length).writeBytes(buf)
  }

  encodeStr(val: string): BufferWriter {
    const buf = Uint8Array.wrap(String.UTF8.encode(val))
    return this.encodeHead(3, buf.length).writeBytes(buf)
  }

  encodeHead(type: u8, val: u64): BufferWriter {
    if (val < 24) {
      this.writeU8((type << 5) | val as u8)
    } else if (val <= 0xFF) {
      this.writeU8((type << 5) | 24).writeU8(val as u8)
    } else if (val <= 0xFFFF) {
      this.writeU8((type << 5) | 25).writeU16(val as u16)
    } else if (val <= 0xFFFFFFFF) {
      this.writeU8((type << 5) | 26).writeU32(val as u32)
    } else {
      this.writeU8((type << 5) | 27).writeU64(val)
    }
    return this
  }
}
