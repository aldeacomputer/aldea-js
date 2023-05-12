import test from 'ava'
import { HDPrivKey, HDPubKey, PubKey, ed25519, blake3, util } from '../dist/index.js'

test.before(t => {
  t.context.hdPrivKey = HDPrivKey.fromRandom()
  t.context.hdPrivKeyBuf = t.context.hdPrivKey.toBytes()
  t.context.hdPrivKeyHex = t.context.hdPrivKey.toHex()
  t.context.hdPrivKeyStr = t.context.hdPrivKey.toString()
})

test('HDPrivKey.fromRandom() generates a new random HDPrivKey', t => {
  const key = HDPrivKey.fromRandom()
  t.true(key instanceof HDPrivKey)
  t.true(key.k instanceof Uint8Array)
  t.true(key.chainCode instanceof Uint8Array)
})

test('HDPrivKey.fromSeed() returns an HDPrivKey with valid seed', t => {
  const seed = util.randomBytes(32)
  const key = HDPrivKey.fromSeed(seed)
  t.true(key instanceof HDPrivKey)
})

test('HDPrivKey.fromSeed() throws with invalid seed', t => {
  t.throws(() => HDPrivKey.fromSeed(new Uint8Array(5)), { message: /invalid seed length/ })
  t.throws(() => HDPrivKey.fromSeed(new Uint8Array(65)), { message: /invalid seed length/ })
  t.throws(() => HDPrivKey.fromSeed())
  t.throws(() => HDPrivKey.fromSeed({}))
  t.throws(() => HDPrivKey.fromSeed(123))
  t.throws(() => HDPrivKey.fromSeed('abc'))
})

test('HDPrivKey.fromBytes() returns a HDPrivKey with valid bytes', t => {
  const key = HDPrivKey.fromBytes(t.context.hdPrivKeyBuf)
  t.true(key instanceof HDPrivKey)
  t.deepEqual(key, t.context.hdPrivKey)
})

test('HDPrivKey.fromBytes() throws with invalid bytes', t => {
  t.throws(() => HDPrivKey.fromBytes(new Uint8Array(5)), { message: /extended key length/ })
  t.throws(() => HDPrivKey.fromBytes(new Uint8Array(65)), { message: /invalid chainCode length/ })
  t.throws(() => HDPrivKey.fromBytes())
  t.throws(() => HDPrivKey.fromBytes({}))
  t.throws(() => HDPrivKey.fromBytes(123))
  t.throws(() => HDPrivKey.fromBytes('abc'))
})

test('HDPrivKey.fromHex() returns a HDPrivKey with valid hex', t => {
  const key = HDPrivKey.fromHex(t.context.hdPrivKeyHex)
  t.true(key instanceof HDPrivKey)
  t.deepEqual(key, t.context.hdPrivKey)
})

test('HDPrivKey.fromHex() throws with invalid hex', t => {
  t.throws(() => HDPrivKey.fromHex())
  t.throws(() => HDPrivKey.fromHex({}))
  t.throws(() => HDPrivKey.fromHex(123))
  t.throws(() => HDPrivKey.fromHex('abc'))
})

test('HDPrivKey.fromString() returns a HDPrivKey with valid string', t => {
  const key = HDPrivKey.fromString(t.context.hdPrivKeyStr)
  t.true(key instanceof HDPrivKey)
  t.deepEqual(key, t.context.hdPrivKey)
})

test('HDPrivKey.fromString() throws with invalid string', t => {
  t.throws(() => HDPrivKey.fromString())
  t.throws(() => HDPrivKey.fromString({}))
  t.throws(() => HDPrivKey.fromString(123))
  t.throws(() => HDPrivKey.fromString('abc'))
})

test('HDPrivKey#derive() returns derived HDPrivKey or HDPubKey with valid path', t => {
  const hdPrivKey = t.context.hdPrivKey.derive('m/0/1/42')
  const hdPubKey = t.context.hdPrivKey.derive('M/0/1/42')
  t.true(hdPrivKey instanceof HDPrivKey)
  t.true(hdPubKey instanceof HDPubKey)
  t.deepEqual(hdPrivKey.toPubKey(), hdPubKey.toPubKey())
})

test('HDPrivKey#derive() returns hardened HDPrivKey', t => {
  const hdPrivKey = t.context.hdPrivKey.derive('m/44h/0h/0h/0/0')
  t.true(hdPrivKey instanceof HDPrivKey)
  t.throws(() => t.context.hdPrivKey.derive('M/44h/0h/0h/0/0'), { message: 'can not derive hardened child key' })
})

test('HDPrivKey#derive() throws with an invalid path', t => {
  t.throws(() => t.context.hdPrivKey.derive('x/1/2/3'), { message: 'invalid derivation path' })
  t.throws(() => t.context.hdPrivKey.derive('m/1x/2/3'), { message: /invalid child index/ })
  t.throws(() => t.context.hdPrivKey.derive('m/2500000000'), { message: /invalid child index/ })
  t.throws(() => t.context.hdPrivKey.derive())
  t.throws(() => t.context.hdPrivKey.derive({}))
  t.throws(() => t.context.hdPrivKey.derive(123))
  t.throws(() => t.context.hdPrivKey.derive('abc'))
})

test('HDPrivKey#deriveChild() returns a derived HDPrivKey with valid index', t => {
  const k1 = t.context.hdPrivKey.deriveChild(100)
  const k2 = t.context.hdPrivKey.deriveChild(2500000000)
  t.true(k1 instanceof HDPrivKey)
  t.true(k2 instanceof HDPrivKey)
})

test('HDPrivKey#deriveChild() throws with an invalid index', t => {
  t.throws(() => t.context.hdPrivKey.deriveChild(-1), { message: /invalid child index/ })
  t.throws(() => t.context.hdPrivKey.deriveChild(), { message: /invalid child index/ })
  t.throws(() => t.context.hdPrivKey.deriveChild({}), { message: /invalid child index/ })
  t.throws(() => t.context.hdPrivKey.deriveChild('abc'), { message: /invalid child index/ })
})

test('HDPrivKey#toBytes() returns a Uint8Array', t => {
  const buf = t.context.hdPrivKey.toBytes()
  t.is(buf.length, 96)
  t.deepEqual(buf, t.context.hdPrivKeyBuf)
})

test('HDPrivKey#toHex() returns a string', t => {
  const hex = t.context.hdPrivKey.toHex()
  t.is(hex.length, 192)
  t.deepEqual(hex, t.context.hdPrivKeyHex)
})

test('HDPrivKey#toString() returns a bech32m string', t => {
  const str = t.context.hdPrivKey.toString()
  t.is(str.length, 165)
  t.deepEqual(str, t.context.hdPrivKeyStr)
})

test('HDPrivKey#toHDPubKey() returns a HDPubKey', t => {
  const hdPubKey = t.context.hdPrivKey.toHDPubKey()
  t.true(hdPubKey instanceof HDPubKey)
})

test('HDPrivKey#toPubKey() returns a PubKey', t => {
  const pubKey = t.context.hdPrivKey.toPubKey()
  t.true(pubKey instanceof PubKey)
})

// # TODO - also add tests for signing/verifying (prob in ed25519 tests)

test('sign and verify using HD keys (x100)', t => {
  const root = HDPrivKey.fromRandom()
  const n0 = root.derive('m/44h/0h/0h/0/0')
  const msg = Buffer.from('test')

  for (let n = 1; n <= 100; n++) {
    const hdKey = n0.derive(`m/${n}`)
    // Derive with both parent and locally
    const p1 = n0.derive(`M/${n}`)
    const p2 = hdKey.toHDPubKey()

    // Sign with both key instance and raw bytes
    const sig1 = ed25519.sign(msg, hdKey)
    const sig2 = ed25519.sign(msg, hdKey.toBytes())

    t.true(sig1 instanceof Uint8Array)
    t.true(sig2 instanceof Uint8Array)
    t.is(sig1.length, 64)
    t.is(sig2.length, 64)
    
    t.true(ed25519.verify(sig1, msg, p1))
    t.true(ed25519.verify(sig1, msg, p2))
    t.true(ed25519.verify(sig2, msg, p1))
    t.true(ed25519.verify(sig2, msg, p2))
  }
})

test('sign and verify fails with wrong message', t => {
  const hdKey = HDPrivKey.fromRandom()
  const hdPub = hdKey.toHDPubKey()
  const sig = ed25519.sign(Buffer.from('test'), hdKey)
  t.false(ed25519.verify(sig, Buffer.from('test2'), hdPub))
})

test('sign and verify fails with wrong pubkey', t => {
  const hdKey = HDPrivKey.fromRandom()
  const hdPub = hdKey.derive('M/1')
  const msg = Buffer.from('test')
  const sig = ed25519.sign(msg, hdKey)
  t.false(ed25519.verify(sig, msg, hdPub))
})
