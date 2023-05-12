import test from 'ava'
import { HDPrivKey, HDPubKey, PubKey } from '../dist/index.js'

test.before(t => {
  t.context.hdPubKey = HDPrivKey.fromRandom().toHDPubKey()
  t.context.hdPubKeyBuf = t.context.hdPubKey.toBytes()
  t.context.hdPubKeyHex = t.context.hdPubKey.toHex()
  t.context.hdPubKeyStr = t.context.hdPubKey.toString()
})

test('HDPubKey.fromBytes() returns a HDPubKey with valid bytes', t => {
  const key = HDPubKey.fromBytes(t.context.hdPubKeyBuf)
  t.true(key instanceof HDPubKey)
  t.deepEqual(key, t.context.hdPubKey)
})

test('HDPubKey.fromBytes() throws with invalid bytes', t => {
  t.throws(() => HDPubKey.fromBytes(new Uint8Array(5)), { message: /extended key length/ })
  t.throws(() => HDPubKey.fromBytes(new Uint8Array(65)), { message: /invalid chainCode length/ })
  t.throws(() => HDPubKey.fromBytes())
  t.throws(() => HDPubKey.fromBytes({}))
  t.throws(() => HDPubKey.fromBytes(123))
  t.throws(() => HDPubKey.fromBytes('abc'))
})

test('HDPubKey.fromHex() returns a HDPubKey with valid hex', t => {
  const key = HDPubKey.fromHex(t.context.hdPubKeyHex)
  t.true(key instanceof HDPubKey)
  t.deepEqual(key, t.context.hdPubKey)
})

test('HDPubKey.fromHex() throws with invalid hex', t => {
  t.throws(() => HDPubKey.fromHex())
  t.throws(() => HDPubKey.fromHex({}))
  t.throws(() => HDPubKey.fromHex(123))
  t.throws(() => HDPubKey.fromHex('abc'))
})

test('HDPubKey.fromString() returns a HDPubKey with valid string', t => {
  const key = HDPubKey.fromString(t.context.hdPubKeyStr)
  t.true(key instanceof HDPubKey)
  t.deepEqual(key, t.context.hdPubKey)
})

test('HDPubKey.fromString() throws with invalid string', t => {
  t.throws(() => HDPubKey.fromString())
  t.throws(() => HDPubKey.fromString({}))
  t.throws(() => HDPubKey.fromString(123))
  t.throws(() => HDPubKey.fromString('abc'))
})

test('HDPubKey#derive() returns a derived HDPubKey with valid path', t => {
  const hdPubKey = t.context.hdPubKey.derive('M/0/1/42')
  t.true(hdPubKey instanceof HDPubKey)
})

test('HDPubKey#derive() throws with an invalid path', t => {
  t.throws(() => t.context.hdPubKey.derive('m/1/2/3'), { message: 'cannot derive private child key' })
  t.throws(() => t.context.hdPubKey.derive('M/1h/2/3'), { message: 'can not derive hardened child key' })
  t.throws(() => t.context.hdPubKey.derive('x/1/2/3'), { message: 'invalid derivation path' })
  t.throws(() => t.context.hdPubKey.derive('M/1x/2/3'), { message: /invalid child index/ })
  t.throws(() => t.context.hdPubKey.derive('M/2500000000'), { message: /invalid child index/ })
  t.throws(() => t.context.hdPubKey.derive())
  t.throws(() => t.context.hdPubKey.derive({}))
  t.throws(() => t.context.hdPubKey.derive(123))
  t.throws(() => t.context.hdPubKey.derive('abc'))
})

test('HDPubKey#deriveChild() returns a derived HDPubKey with valid index', t => {
  const k1 = t.context.hdPubKey.deriveChild(100)
  t.true(k1 instanceof HDPubKey)
})

test('HDPubKey#deriveChild() throws with an invalid index', t => {
  t.throws(() => t.context.hdPubKey.deriveChild(2500000000), { message: 'can not derive hardened child key' })
  t.throws(() => t.context.hdPubKey.deriveChild(-1), { message: /invalid child index/ })
  t.throws(() => t.context.hdPubKey.deriveChild(), { message: /invalid child index/ })
  t.throws(() => t.context.hdPubKey.deriveChild({}), { message: /invalid child index/ })
  t.throws(() => t.context.hdPubKey.deriveChild('abc'), { message: /invalid child index/ })
})

test('HDPubKey#toBytes() returns a Uint8Array', t => {
  const buf = t.context.hdPubKey.toBytes()
  t.is(buf.length, 64)
  t.deepEqual(buf, t.context.hdPubKeyBuf)
})

test('HDPubKey#toHex() returns a string', t => {
  const hex = t.context.hdPubKey.toHex()
  t.is(hex.length, 128)
  t.deepEqual(hex, t.context.hdPubKeyHex)
})

test('HDPubKey#toString() returns a bech32m string', t => {
  const str = t.context.hdPubKey.toString()
  t.is(str.length, 114)
  t.deepEqual(str, t.context.hdPubKeyStr)
})

test('HDPubKey#toPubKey() returns a PubKey', t => {
  const pubKey = t.context.hdPubKey.toPubKey()
  t.true(pubKey instanceof PubKey)
})
