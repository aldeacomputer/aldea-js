import test from 'ava'
import { hash } from '../../dist/support/blake3.js'

test('hash() hashes the given text', t => {
  t.is(Buffer.from(hash('f')).toString('hex'), '9ab388bedc43eaf44150107d17ad090f6b1c34610f5740778ddb95d9f06576ee')
  t.is(Buffer.from(hash('fo')).toString('hex'), '0d896f728cb2488afa127e075087e5b1feddbb530d6f9f2193698eaa716ff95c')
  t.is(Buffer.from(hash('foo')).toString('hex'), '04e0bb39f30b1a3feb89f536c93be15055482df748674b00d26e5a75777702e9')
  t.is(Buffer.from(hash('foob')).toString('hex'), '00700d55e2cc63c48fa236c3b7d5a9d899b3fabaf2710e973dbcd09828e998cc')
  t.is(Buffer.from(hash('fooba')).toString('hex'), '5f2b7ddb1973cec23a107a8fdbea287aee62ca0e7a6acc08eea825cab1286d1b')
  t.is(Buffer.from(hash('foobar')).toString('hex'), 'aa51dcd43d5c6c5203ee16906fd6b35db298b9b2e1de3fce81811d4806b76b7d')
})

test('hash() hash length is configurable', t => {
  t.is(Buffer.from(hash('foobar', 64)).toString('hex'), 'aa51dcd43d5c6c5203ee16906fd6b35db298b9b2e1de3fce81811d4806b76b7d05569a60d11876efa1242e0991dda389d96c9536927cf68ba623c6ea37a236a5')
})

test('base16.encode() throws with invalid args', t => {
  t.throws(() => hash(), { message: /^expected Uint8Array, got undefined/ })
  t.throws(() => hash(1))
  t.throws(() => hash({}))
  t.throws(() => hash('foobar', 'xxx'), { message: /^Wrong positive integer/ })
})
