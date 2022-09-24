import { toHex } from "../support"
import { BufferWriter } from "../../shared/buffer-writer"

describe("BufferWriter", () => {
  test("BufferWriter#writeBytes() writes a Uint8Array", () => {
    const buf = new BufferWriter()
    const bytes = new Uint8Array(4)
    bytes.set([1, 2, 3, 4])
    buf.writeBytes(bytes)
    expect(toHex(buf.toBytes())).toBe('01020304')
  })

  test("BufferWriter#writeF32() writes a 32 bit float", () => {
    const buf = new BufferWriter()
    buf.writeF32(333.67)
    expect(toHex(buf.toBytes())).toBe('43a6d5c3')
  })

  test("BufferWriter#writeF64() writes a 64 bit float", () => {
    const buf = new BufferWriter()
    buf.writeF64(333.67)
    expect(toHex(buf.toBytes())).toBe('4074dab851eb851f')
  })

  test("BufferWriter#writeI8() writes a 8 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeI8(120)
    expect(toHex(buf.toBytes())).toBe('78')
  })

  test("BufferWriter#writeI16() writes a 16 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeI16(3600)
    expect(toHex(buf.toBytes())).toBe('0e10')
  })

  test("BufferWriter#writeI32() writes a 32 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeI32(3600256)
    expect(toHex(buf.toBytes())).toBe('0036ef80')
  })

  test("BufferWriter#writeI64() writes a 64 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeI64(-3600256)
    expect(toHex(buf.toBytes())).toBe('ffffffffffc91080')
  })

  test("BufferWriter#writeU8() writes a 8 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeU8(255)
    expect(toHex(buf.toBytes())).toBe('ff')
  })

  test("BufferWriter#writeU16() writes a 16 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeU16(2555)
    expect(toHex(buf.toBytes())).toBe('09fb')
  })

  test("BufferWriter#writeU32() writes a 32 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeU32(255555)
    expect(toHex(buf.toBytes())).toBe('0003e643')
  })

  test("BufferWriter#writeU64() writes a 64 bit integer", () => {
    const buf = new BufferWriter()
    buf.writeU64(255555)
    expect(toHex(buf.toBytes())).toBe('000000000003e643')
  })

  test("BufferWriter can be chained together", () => {
    const buf = new BufferWriter()
    const bytes = new Uint8Array(4)
    bytes.set([1, 2, 3, 4])
    buf.writeBytes(bytes).writeU8(255).writeI64(-767852135)
    expect(toHex(buf.toBytes())).toBe('01020304ffffffffffd23b8199')
  })
})
