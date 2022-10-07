import test from 'ava'
import { base16, base64, bech32m } from '../../dist/support/base.js'

test('base16.encode() encodes valid bytes as hex', t => {
  t.is(base16.encode(Buffer.from('')), '')
  t.is(base16.encode(Buffer.from('f')), '66')
  t.is(base16.encode(Buffer.from('fo')), '666f')
  t.is(base16.encode(Buffer.from('foo')), '666f6f')
  t.is(base16.encode(Buffer.from('foob')), '666f6f62')
  t.is(base16.encode(Buffer.from('fooba')), '666f6f6261')
  t.is(base16.encode(Buffer.from('foobar')), '666f6f626172')
})

test('base16.encode() throws with invalid args', t => {
  t.throws(() => base16.encode(), { message: /input should be Uint8Array/ })
  t.throws(() => base16.encode({}))
  t.throws(() => base16.encode(123))
  t.throws(() => base16.encode('abc'))
})

test('base16.decode() decodes valid hex to bytes', t => {
  t.is(Buffer.from(base16.decode('')).toString(), '')
  t.is(Buffer.from(base16.decode('66')).toString(), 'f')
  t.is(Buffer.from(base16.decode('666f')).toString(), 'fo')
  t.is(Buffer.from(base16.decode('666f6f')).toString(), 'foo')
  t.is(Buffer.from(base16.decode('666f6f62')).toString(), 'foob')
  t.is(Buffer.from(base16.decode('666f6f6261')).toString(), 'fooba')
  t.is(Buffer.from(base16.decode('666f6f626172')).toString(), 'foobar')
})

test('base16.decode() throws with invalid args', t => {
  t.throws(() => base16.decode(), { message: /input should be string/ })
  t.throws(() => base16.decode({}))
  t.throws(() => base16.decode(123))
  t.throws(() => base16.decode('abc'))
})

test('base64.encode() encodes valid bytes as base64', t => {
  t.is(base64.encode(Buffer.from('')), '')
  t.is(base64.encode(Buffer.from('f')), 'Zg==')
  t.is(base64.encode(Buffer.from('fo')), 'Zm8=')
  t.is(base64.encode(Buffer.from('foo')), 'Zm9v')
  t.is(base64.encode(Buffer.from('foob')), 'Zm9vYg==')
  t.is(base64.encode(Buffer.from('fooba')), 'Zm9vYmE=')
  t.is(base64.encode(Buffer.from('foobar')), 'Zm9vYmFy')
})

test('base64.encode() throws with invalid args', t => {
  t.throws(() => base64.encode(), { message: /input should be Uint8Array/ })
  t.throws(() => base64.encode({}))
  t.throws(() => base64.encode(123))
  t.throws(() => base64.encode('abc'))
})

test('base64.decode() decodes valid base64 to bytes', t => {
  t.is(Buffer.from(base64.decode('')).toString(), '')
  t.is(Buffer.from(base64.decode('Zg==')).toString(), 'f')
  t.is(Buffer.from(base64.decode('Zm8=')).toString(), 'fo')
  t.is(Buffer.from(base64.decode('Zm9v')).toString(), 'foo')
  t.is(Buffer.from(base64.decode('Zm9vYg==')).toString(), 'foob')
  t.is(Buffer.from(base64.decode('Zm9vYmE=')).toString(), 'fooba')
  t.is(Buffer.from(base64.decode('Zm9vYmFy')).toString(), 'foobar')
})

test('base64.decode() throws with invalid args', t => {
  t.throws(() => base64.decode(), { message: /input should be string/ })
  t.throws(() => base64.decode({}))
  t.throws(() => base64.decode(123))
  t.throws(() => base64.decode('abc'))
})

test('bech32m.encode() encodes valid bytes as bech32', t => {
  t.is(bech32m.encode(Buffer.from('f'), 'test'), 'test1vcz0pdf0')
  t.is(bech32m.encode(Buffer.from('fo'), 'test'), 'test1vehsgvqpjy')
  t.is(bech32m.encode(Buffer.from('foo'), 'test'), 'test1vehk7qrrrlg')
  t.is(bech32m.encode(Buffer.from('foob'), 'test'), 'test1vehk7csqjqa7u')
  t.is(bech32m.encode(Buffer.from('fooba'), 'test'), 'test1vehk7cnpsf6waq')
  t.is(bech32m.encode(Buffer.from('foobar'), 'test'), 'test1vehk7cnpwg58qqtk')
})

test('bech32m.encode() throws with invalid args', t => {
  t.throws(() => bech32m.encode(), { message: /input should be Uint8Array/ })
  t.throws(() => bech32m.encode({}))
  t.throws(() => bech32m.encode(123))
  t.throws(() => bech32m.encode('abc'))
})

test('bech32m.decode() decodes valid bech32 to bytes', t => {
  t.is(Buffer.from(bech32m.decode('test1vcz0pdf0', 'test')).toString(), 'f')
  t.is(Buffer.from(bech32m.decode('test1vehsgvqpjy', 'test')).toString(), 'fo')
  t.is(Buffer.from(bech32m.decode('test1vehk7qrrrlg', 'test')).toString(), 'foo')
  t.is(Buffer.from(bech32m.decode('test1vehk7csqjqa7u', 'test')).toString(), 'foob')
  t.is(Buffer.from(bech32m.decode('test1vehk7cnpsf6waq', 'test')).toString(), 'fooba')
  t.is(Buffer.from(bech32m.decode('test1vehk7cnpwg58qqtk', 'test')).toString(), 'foobar')
})

test('bech32m.decode() throws with invalid prefix', t => {
  t.throws(() => bech32m.decode('test1vcz0pdf0', 'xxx'), { message: /^invalid prefix/ })
})

test('bech32m.decode() throws with invalid args', t => {
  t.throws(() => bech32m.decode(), { message: /input should be string/ })
  t.throws(() => bech32m.decode({}))
  t.throws(() => bech32m.decode(123))
  t.throws(() => bech32m.decode('abc'))
})
