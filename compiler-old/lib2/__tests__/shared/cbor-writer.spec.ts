import { toHex } from "../support"
import { CborWriter } from "../../shared/cbor-writer"

describe("CborWriter#encode<integer>()", () => {
  test("encodes a tiny int", () => {
    const cbor = new CborWriter()
    cbor.encode<u8>(12)
    expect(toHex(cbor.toBytes())).toBe('0c')
  })

  test("encodes a positive 8 bit int", () => {
    const cbor = new CborWriter()
    cbor.encode<u8>(120)
    expect(toHex(cbor.toBytes())).toBe('1878')
  })

  test("encodes a positive 16 bit int", () => {
    const cbor = new CborWriter()
    cbor.encode<u16>(50000)
    expect(toHex(cbor.toBytes())).toBe('19c350')
  })

  test("encodes a positive 32 bit int", () => {
    const cbor = new CborWriter()
    cbor.encode<u32>(3000000000)
    expect(toHex(cbor.toBytes())).toBe('1ab2d05e00')
  })

  test("encodes a negative 8 bit int", () => {
    const cbor = new CborWriter()
    cbor.encode<i8>(-120)
    expect(toHex(cbor.toBytes())).toBe('3877')
  })

  test("encodes a negative 16 bit int", () => {
    const cbor = new CborWriter()
    cbor.encode<i16>(-20000)
    expect(toHex(cbor.toBytes())).toBe('394e1f')
  })

  test("encodes a negative 32 bit int", () => {
    const cbor = new CborWriter()
    cbor.encode<i32>(-2000000000)
    expect(toHex(cbor.toBytes())).toBe('3a773593ff')
  })
})

describe("CborWriter#encode<float>()", () => {
  test("encodes a positive float", () => {
    const cbor = new CborWriter()
    cbor.encode<f64>(123.1237987)
    expect(toHex(cbor.toBytes())).toBe('fb405ec7ec5161f263')
  })

  test("encodes a negative float", () => {
    const cbor = new CborWriter()
    cbor.encode<f64>(-123.1237987)
    expect(toHex(cbor.toBytes())).toBe('fbc05ec7ec5161f263')
  })

  test("encodes a complex float", () => {
    const cbor = new CborWriter()
    cbor.encode<f64>(1.91111111111111111111111)
    expect(toHex(cbor.toBytes())).toBe('fb3ffe93e93e93e93f')
  })
})

describe("CborWriter#encode<string>()", () => {
  test("encodes a simple string", () => {
    const cbor = new CborWriter()
    cbor.encode<string>('hello world!')
    expect(toHex(cbor.toBytes())).toBe('6c68656c6c6f20776f726c6421')
  })

  test("encodes a emoji string", () => {
    const cbor = new CborWriter()
    cbor.encode<string>('😱!!! The 🏘 is 🔛 🔥!')
    expect(toHex(cbor.toBytes())).toBe('781ef09f98b12121212054686520f09f8f9820697320f09f949b20f09f94a521')
  })
})

describe("CborWriter#encode<ArrayBuffer>()", () => {
  test("encodes a simple binary string", () => {
    const cbor = new CborWriter()
    const data = new Uint8Array(6)
    data.set([0, 1, 2, 255, 254, 253])
    cbor.encode<ArrayBuffer>(data.buffer)
    expect(toHex(cbor.toBytes())).toBe('46000102fffefd')
  })
})

describe("CborWriter#encode() simple valies", () => {
  test("encodes false", () => {
    const cbor = new CborWriter()
    const val = false
    cbor.encode(val)
    expect(toHex(cbor.toBytes())).toBe('f4')
  })

  test("encodes true", () => {
    const cbor = new CborWriter()
    const val = true
    cbor.encode(val)
    expect(toHex(cbor.toBytes())).toBe('f5')
  })

  test("encodes null", () => {
    const cbor = new CborWriter()
    const val: string | null = null
    cbor.encode(val)
    expect(toHex(cbor.toBytes())).toBe('f6')
  })
})