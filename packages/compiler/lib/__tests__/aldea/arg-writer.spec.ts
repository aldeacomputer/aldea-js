import { ArgWriter } from '../../aldea/arg-writer'

function toHex(bytes: Uint8Array): string {
  return bytes.reduce((hex, byte) => {
    return hex += ('0' + byte.toString(16)).slice(-2)
  }, '')
}

describe("ArgWriter", () => {
  test("encodes an i8", () => {
    const args = new ArgWriter(1)
    args.writeI8(127)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('7f')
  })

  test("encodes an i16", () => {
    const args = new ArgWriter(2)
    args.writeI16(32767)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ff7f')
  })

  test("encodes an i32", () => {
    const args = new ArgWriter(4)
    args.writeI32(2147483647)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ffffff7f')
  })

  test("encodes an i64", () => {
    const args = new ArgWriter(8)
    args.writeI64(9223372036854775807)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ffffffffffffff7f')
  })

  test("encodes an u8", () => {
    const args = new ArgWriter(1)
    args.writeU8(255)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ff')
  })

  test("encodes an u16", () => {
    const args = new ArgWriter(2)
    args.writeU16(65535)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ffff')
  })

  test("encodes an u32", () => {
    const args = new ArgWriter(4)
    args.writeU32(4294967295)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ffffffff')
  })

  test("encodes an u64", () => {
    const args = new ArgWriter(8)
    args.writeU64(18446744073709551615)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('ffffffffffffffff')
  })

  test("encodes an f32", () => {
    const args = new ArgWriter(4)
    args.writeF32(123.123)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('fa3ef642')
  })

  test("encodes an f64", () => {
    const args = new ArgWriter(8)
    args.writeF64(12345.12345)
    expect(toHex(Uint8Array.wrap(args.buffer))).toBe('58a835cd8f1cc840')
  })
})
