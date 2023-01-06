import { Bytes, fromBech32m, toHex } from "../../aldea/bytes"

function dataArray(data: u8[]): Uint8Array {
  return data.reduce((buf, n, i) => {
    buf[i] = n
    return buf
  }, new Uint8Array(data.length))
}

describe("Bytes decoding", () => {
  test("decodes base16 to string", () => {
    expect(Bytes.fromBase16('').toString()).toBe('')
    expect(Bytes.fromBase16('66').toString()).toBe('f')
    expect(Bytes.fromBase16('666F').toString()).toBe('fo')
    expect(Bytes.fromBase16('666F6F').toString()).toBe('foo')
    expect(Bytes.fromBase16('666F6F62').toString()).toBe('foob')
    expect(Bytes.fromBase16('666F6F6261').toString()).toBe('fooba')
    expect(Bytes.fromBase16('666F6F626172').toString()).toBe('foobar')
  })

//  test("decodes test vector", () => {
//    expect(() => Bytes.fromBase16('A1B2C3D4E5F67891')).toBeTruthy()
//  })

  test("wont decode bad base16 vectors", () => {
    expect(() => { Bytes.fromBase16('0') }).toThrow()
    expect(() => { Bytes.fromBase16('0=') }).toThrow()
    expect(() => { Bytes.fromBase16('00=') }).toThrow()
    expect(() => { Bytes.fromBase16('что') }).toThrow()
    expect(() => { Bytes.fromBase16('M😴') }).toThrow()
  })

  test("decodes base64 to string", () => {
    expect(Bytes.fromBase64('').toString()).toBe('')
    expect(Bytes.fromBase64('Zg==').toString()).toBe('f')
    expect(Bytes.fromBase64('Zm8=').toString()).toBe('fo')
    expect(Bytes.fromBase64('Zm9v').toString()).toBe('foo')
    expect(Bytes.fromBase64('Zm9vYg==').toString()).toBe('foob')
    expect(Bytes.fromBase64('Zm9vYmE=').toString()).toBe('fooba')
    expect(Bytes.fromBase64('Zm9vYmFy').toString()).toBe('foobar')
  })

  test("decodes base64url to string", () => {
    expect(Bytes.fromBase64url('').toString()).toBe('')
    expect(Bytes.fromBase64url('Zg').toString()).toBe('f')
    expect(Bytes.fromBase64url('Zm8').toString()).toBe('fo')
    expect(Bytes.fromBase64url('Zm9v').toString()).toBe('foo')
    expect(Bytes.fromBase64url('Zm9vYg').toString()).toBe('foob')
    expect(Bytes.fromBase64url('Zm9vYmE').toString()).toBe('fooba')
    expect(Bytes.fromBase64url('Zm9vYmFy').toString()).toBe('foobar')
  })

  test("decodes base64url with safe chars", () => {
    expect(Bytes.fromBase64url('_3_-_A').toHex()).toBe('ff7ffefc')
  })

  test("decodes valid base64 vectors", () => {
    expect(Bytes.fromBase64('aGVsbG8gd29ybGQ=').toHex()).toBe('68656c6c6f20776f726c64')
    expect(Bytes.fromBase64('AA==').toHex()).toBe('00')
    expect(Bytes.fromBase64('AAA=').toHex()).toBe('0000')
    expect(Bytes.fromBase64('AAAA').toHex()).toBe('000000')
    expect(Bytes.fromBase64('AAAAAA==').toHex()).toBe('00000000')
    expect(Bytes.fromBase64('AAAAAAA=').toHex()).toBe('0000000000')
    expect(Bytes.fromBase64('AAAAAAAA').toHex()).toBe('000000000000')
    expect(Bytes.fromBase64('bxCkKCbYPXj3dnNSTUGqmw==').toHex()).toBe('6f10a42826d83d78f77673524d41aa9b')
    expect(Bytes.fromBase64('2AjVfT2F/sCE5S+XDj+O5juP6OQ=').toHex()).toBe('d808d57d3d85fec084e52f970e3f8ee63b8fe8e4')
    expect(Bytes.fromBase64('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef').toHex()).toBe('00108310518720928b30d38f41149351559761969b71d79f')
    expect(Bytes.fromBase64('ghijklmnopqrstuvwxyz0123456789+/').toHex()).toBe('8218a39259a7a29aabb2dbafc31cb3d35db7e39ebbf3dfbf')
    expect(Bytes.fromBase64('+/8=').toHex()).toBe('fbff')
  })

  test("wont decode bad base64 vectors", () => {
    expect(() => { Bytes.fromBase64('A===') }).toThrow()
    expect(() => { Bytes.fromBase64('+/+=') }).toThrow()
    expect(() => { Bytes.fromBase64('AAAAA') }).toThrow()
    expect(() => { Bytes.fromBase64('AA=') }).toThrow()
    expect(() => { Bytes.fromBase64('=') }).toThrow()
    expect(() => { Bytes.fromBase64('==') }).toThrow()
    expect(() => { Bytes.fromBase64('Zg===') }).toThrow()
    expect(() => { Bytes.fromBase64('AAA') }).toThrow()
    expect(() => { Bytes.fromBase64('=Zm8') }).toThrow()
    expect(() => { Bytes.fromBase64('что') }).toThrow()
    expect(() => { Bytes.fromBase64('M😴') }).toThrow()
  })

  test("decodes bech32 to string", () => {
    expect(Bytes.fromBech32('test12hrzfj').toString()).toBe('')
    expect(Bytes.fromBech32('test1vchn3pvd').toString()).toBe('f')
    expect(Bytes.fromBech32('test1vehsassdhx').toString()).toBe('fo')
    expect(Bytes.fromBech32('test1vehk74ln062').toString()).toBe('foo')
    expect(Bytes.fromBech32('test1vehk7cs4ws3m7').toString()).toBe('foob')
    expect(Bytes.fromBech32('test1vehk7cnp942zcz').toString()).toBe('fooba')
    expect(Bytes.fromBech32('test1vehk7cnpwgpmsvw5').toString()).toBe('foobar')
  })

  test("decodes bech32m to string", () => {
    expect(Bytes.fromBech32m('test1ltnwvs').toString()).toBe('')
    expect(Bytes.fromBech32m('test1vcz0pdf0').toString()).toBe('f')
    expect(Bytes.fromBech32m('test1vehsgvqpjy').toString()).toBe('fo')
    expect(Bytes.fromBech32m('test1vehk7qrrrlg').toString()).toBe('foo')
    expect(Bytes.fromBech32m('test1vehk7csqjqa7u').toString()).toBe('foob')
    expect(Bytes.fromBech32m('test1vehk7cnpsf6waq').toString()).toBe('fooba')
    expect(Bytes.fromBech32m('test1vehk7cnpwg58qqtk').toString()).toBe('foobar')
  })

  test("decodes bech32m address to pubkeyHash", () => {
    const addr = 'addr17xgmlq360qnrjwa3qcr6arhlw4853ysm0qa3rd'
    const buf = fromBech32m(addr)
    expect(buf.byteLength).toBe(20)
  })

//  test("decodes valid bech2 test vectors", () => {
//    expect(() => Bytes.fromBech32('A12UEL5L')).toBeTruthy()
//    expect(() => Bytes.fromBech32('a12uel5l')).toBeTruthy()
//    expect(() => Bytes.fromBech32('an83characterlonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1tt5tgs')).toBeTruthy()
//    expect(() => Bytes.fromBech32('abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw')).toBeTruthy()
//    expect(() => Bytes.fromBech32('11qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc8247j')).toBeTruthy()
//    expect(() => Bytes.fromBech32('split1checkupstagehandshakeupstreamerranterredcaperred2y9e3w')).toBeTruthy()
//    expect(() => Bytes.fromBech32('?1ezyfcl')).toBeTruthy()
//  })
//
//  test("wont decode invalid bech2 test vectors", () => {
//    expect(() => { Bytes.fromBech32('an84characterslonghumanreadablepartthatcontainsthenumber1andtheexcludedcharactersbio1569pvx') }).toThrow() // max length
//    expect(() => { Bytes.fromBech32('pzry9x0s0muk') }).toThrow() // no seperator
//    expect(() => { Bytes.fromBech32('1pzry9x0s0muk') }).toThrow() // empty hrp
//    expect(() => { Bytes.fromBech32('10a06t8') }).toThrow() // empty hrp
//    expect(() => { Bytes.fromBech32('1qzzfhee') }).toThrow() // empty hrp
//    expect(() => { Bytes.fromBech32('x1b4n0q5v') }).toThrow() // invalid checksum
//    expect(() => { Bytes.fromBech32('li1dgmt3') }).toThrow() // too short checksum
//    expect(() => { Bytes.fromBech32('A1G7SGD8') }).toThrow() // checksum made with uppercase data
//  })

  test("decodes hex to string", () => {
    expect(Bytes.fromHex('').toString()).toBe('')
    expect(Bytes.fromHex('66').toString()).toBe('f')
    expect(Bytes.fromHex('666f').toString()).toBe('fo')
    expect(Bytes.fromHex('666f6f').toString()).toBe('foo')
    expect(Bytes.fromHex('666f6f62').toString()).toBe('foob')
    expect(Bytes.fromHex('666f6f6261').toString()).toBe('fooba')
    expect(Bytes.fromHex('666f6f626172').toString()).toBe('foobar')
  })

  test("decodes utf-16 string", () => {
    const bytes = Bytes.fromString('hello world!')
    expect(bytes.buffer.byteLength).toBe(12)
  })
})

describe('Bytes encoding', () => {
  test("encodes string to base16", () => {
    expect(Bytes.fromString('').toBase16()).toBe('')
    expect(Bytes.fromString('f').toBase16()).toBe('66')
    expect(Bytes.fromString('fo').toBase16()).toBe('666F')
    expect(Bytes.fromString('foo').toBase16()).toBe('666F6F')
    expect(Bytes.fromString('foob').toBase16()).toBe('666F6F62')
    expect(Bytes.fromString('fooba').toBase16()).toBe('666F6F6261')
    expect(Bytes.fromString('foobar').toBase16()).toBe('666F6F626172')
  })

  test("encodes buffer to base16", () => {
    const data = dataArray([161, 178, 195, 212, 229, 246, 120, 145])
    expect(new Bytes(data.buffer).toBase16()).toBe('A1B2C3D4E5F67891')
  })

  test("encodes string to base64", () => {
    expect(Bytes.fromString('').toBase64()).toBe('')
    expect(Bytes.fromString('f').toBase64()).toBe('Zg==')
    expect(Bytes.fromString('fo').toBase64()).toBe('Zm8=')
    expect(Bytes.fromString('foo').toBase64()).toBe('Zm9v')
    expect(Bytes.fromString('foob').toBase64()).toBe('Zm9vYg==')
    expect(Bytes.fromString('fooba').toBase64()).toBe('Zm9vYmE=')
    expect(Bytes.fromString('foobar').toBase64()).toBe('Zm9vYmFy')
  })

  test("encodes valid vectors to base64", () => {
    expect(Bytes.fromHex('68656c6c6f20776f726c64').toBase64()).toBe('aGVsbG8gd29ybGQ=')
    expect(Bytes.fromHex('00').toBase64()).toBe('AA==')
    expect(Bytes.fromHex('0000').toBase64()).toBe('AAA=')
    expect(Bytes.fromHex('000000').toBase64()).toBe('AAAA')
    expect(Bytes.fromHex('00000000').toBase64()).toBe('AAAAAA==')
    expect(Bytes.fromHex('0000000000').toBase64()).toBe('AAAAAAA=')
    expect(Bytes.fromHex('000000000000').toBase64()).toBe('AAAAAAAA')
    expect(Bytes.fromHex('6f10a42826d83d78f77673524d41aa9b').toBase64()).toBe('bxCkKCbYPXj3dnNSTUGqmw==')
    expect(Bytes.fromHex('d808d57d3d85fec084e52f970e3f8ee63b8fe8e4').toBase64()).toBe('2AjVfT2F/sCE5S+XDj+O5juP6OQ=')
    expect(Bytes.fromHex('00108310518720928b30d38f41149351559761969b71d79f').toBase64()).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef')
    expect(Bytes.fromHex('8218a39259a7a29aabb2dbafc31cb3d35db7e39ebbf3dfbf').toBase64()).toBe('ghijklmnopqrstuvwxyz0123456789+/')
    expect(Bytes.fromHex('fbff').toBase64()).toBe('+/8=')
  })

  test("encodes string to base6url4", () => {
    expect(Bytes.fromString('').toBase64url()).toBe('')
    expect(Bytes.fromString('f').toBase64url()).toBe('Zg')
    expect(Bytes.fromString('fo').toBase64url()).toBe('Zm8')
    expect(Bytes.fromString('foo').toBase64url()).toBe('Zm9v')
    expect(Bytes.fromString('foob').toBase64url()).toBe('Zm9vYg')
    expect(Bytes.fromString('fooba').toBase64url()).toBe('Zm9vYmE')
    expect(Bytes.fromString('foobar').toBase64url()).toBe('Zm9vYmFy')
  })

  test("encodes base64url with optional padding", () => {
    const data = dataArray([161, 178, 195, 212, 229, 246, 120, 145])
    expect(new Bytes(data.buffer).toBase64url()).toBe('obLD1OX2eJE')
    expect(new Bytes(data.buffer).toBase64url(true)).toBe('obLD1OX2eJE=')
  })

  test("encodes base64url with url-safe characters", () => {
    const hex = 'ff7ffefc'
    expect(Bytes.fromHex(hex).toBase64()).toBe('/3/+/A==')
    expect(Bytes.fromHex(hex).toBase64url()).toBe('_3_-_A')
    expect(Bytes.fromHex('fbff').toBase64url()).toBe('-_8')
  })

  test("encodes string to base32", () => {
    expect(Bytes.fromString('').toBech32('test')).toBe('test12hrzfj')
    expect(Bytes.fromString('f').toBech32('test')).toBe('test1vchn3pvd')
    expect(Bytes.fromString('fo').toBech32('test')).toBe('test1vehsassdhx')
    expect(Bytes.fromString('foo').toBech32('test')).toBe('test1vehk74ln062')
    expect(Bytes.fromString('foob').toBech32('test')).toBe('test1vehk7cs4ws3m7')
    expect(Bytes.fromString('fooba').toBech32('test')).toBe('test1vehk7cnp942zcz')
    expect(Bytes.fromString('foobar').toBech32('test')).toBe('test1vehk7cnpwgpmsvw5')
  })

  test("encodes string to base32m", () => {
    expect(Bytes.fromString('').toBech32m('test')).toBe('test1ltnwvs')
    expect(Bytes.fromString('f').toBech32m('test')).toBe('test1vcz0pdf0')
    expect(Bytes.fromString('fo').toBech32m('test')).toBe('test1vehsgvqpjy')
    expect(Bytes.fromString('foo').toBech32m('test')).toBe('test1vehk7qrrrlg')
    expect(Bytes.fromString('foob').toBech32m('test')).toBe('test1vehk7csqjqa7u')
    expect(Bytes.fromString('fooba').toBech32m('test')).toBe('test1vehk7cnpsf6waq')
    expect(Bytes.fromString('foobar').toBech32m('test')).toBe('test1vehk7cnpwg58qqtk')
  })

  test("encodes string to hex", () => {
    expect(Bytes.fromString('').toHex()).toBe('')
    expect(Bytes.fromString('f').toHex()).toBe('66')
    expect(Bytes.fromString('fo').toHex()).toBe('666f')
    expect(Bytes.fromString('foo').toHex()).toBe('666f6f')
    expect(Bytes.fromString('foob').toHex()).toBe('666f6f62')
    expect(Bytes.fromString('fooba').toHex()).toBe('666f6f6261')
    expect(Bytes.fromString('foobar').toHex()).toBe('666f6f626172')
  })

  test("encodes to/from utf-16 strings", () => {
    expect(Bytes.fromString('hello world!').toString()).toBe('hello world!')
  })
})
