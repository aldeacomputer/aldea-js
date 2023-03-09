import test from 'ava'
import { blake3 } from '../../dist/support/hash.js'

test('blake3() hashes the given text', t => {
  t.is(Buffer.from(blake3('f')).toString('hex'), '9ab388bedc43eaf44150107d17ad090f6b1c34610f5740778ddb95d9f06576ee')
  t.is(Buffer.from(blake3('fo')).toString('hex'), '0d896f728cb2488afa127e075087e5b1feddbb530d6f9f2193698eaa716ff95c')
  t.is(Buffer.from(blake3('foo')).toString('hex'), '04e0bb39f30b1a3feb89f536c93be15055482df748674b00d26e5a75777702e9')
  t.is(Buffer.from(blake3('foob')).toString('hex'), '00700d55e2cc63c48fa236c3b7d5a9d899b3fabaf2710e973dbcd09828e998cc')
  t.is(Buffer.from(blake3('fooba')).toString('hex'), '5f2b7ddb1973cec23a107a8fdbea287aee62ca0e7a6acc08eea825cab1286d1b')
  t.is(Buffer.from(blake3('foobar')).toString('hex'), 'aa51dcd43d5c6c5203ee16906fd6b35db298b9b2e1de3fce81811d4806b76b7d')
})

test('blake3() hash length is configurable', t => {
  t.is(Buffer.from(blake3('foobar', 64)).toString('hex'), 'aa51dcd43d5c6c5203ee16906fd6b35db298b9b2e1de3fce81811d4806b76b7d05569a60d11876efa1242e0991dda389d96c9536927cf68ba623c6ea37a236a5')
})

test('base16.encode() throws with invalid args', t => {
  t.throws(() => blake3(), { message: /^Expected input type is Uint8Array/ })
  t.throws(() => blake3(1))
  t.throws(() => blake3({}))
  t.throws(() => blake3('foobar', 'xxx'), { message: /^Wrong positive integer/ })
})
