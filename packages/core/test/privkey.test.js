import test from 'ava'
import { KeyPair, PrivKey, PubKey } from '../dist/index.js'

test.before(t => {
  t.context.privKey = PrivKey.fromRandom()
  t.context.privKeyBuf = t.context.privKey.toBytes()
  t.context.privKeyHex = t.context.privKey.toHex()
  t.context.privKeyStr = t.context.privKey.toString()
})

test('PrivKey.fromRandom() returns a new PrivKey', t => {
  const key = PrivKey.fromRandom()
  t.true(key instanceof PrivKey)
  t.true(key.d instanceof Uint8Array)
})

test('PrivKey.fromBytes() returns a PrivKey with valid bytes', t => {
  const key = PrivKey.fromBytes(t.context.privKeyBuf)
  t.true(key instanceof PrivKey)
  t.deepEqual(key, t.context.privKey)
})

test('PrivKey.fromBytes() throws with incorrect bytes length', t => {
  t.throws(() => PrivKey.fromBytes(new Uint8Array(5)), { message: 'PrivKey must be 32 bytes' })
  t.throws(() => PrivKey.fromBytes(new Uint8Array(35)), { message: 'PrivKey must be 32 bytes' })
})

test('PrivKey.fromBytes() throws with invalid bytes', t => {
  t.throws(() => PrivKey.fromBytes(), { message: 'The first argument to `PrivKey.fromBytes()` must be a `Uint8Array`' })
  t.throws(() => PrivKey.fromBytes({}))
  t.throws(() => PrivKey.fromBytes(123))
  t.throws(() => PrivKey.fromBytes('abc'))
})

test('PrivKey.fromHex() returns a PrivKey with valid hex', t => {
  const key = PrivKey.fromHex(t.context.privKeyHex)
  t.true(key instanceof PrivKey)
  t.deepEqual(key, t.context.privKey)
})

test('PrivKey.fromHex() throws with invalid hex', t => {
  t.throws(() => PrivKey.fromHex(), { message: 'The first argument to `PrivKey.fromHex()` must be a `string`' })
  t.throws(() => PrivKey.fromHex({}))
  t.throws(() => PrivKey.fromHex(123))
  t.throws(() => PrivKey.fromHex('abc'))
})

test('PrivKey.fromString() returns a PrivKey with valid string', t => {
  const key = PrivKey.fromString(t.context.privKeyStr)
  t.true(key instanceof PrivKey)
  t.deepEqual(key, t.context.privKey)
})

test('PrivKey.fromString() throws with invalid string', t => {
  t.throws(() => PrivKey.fromString('asec1notaprivkey'))
  t.throws(() => PrivKey.fromString())
  t.throws(() => PrivKey.fromString({}))
  t.throws(() => PrivKey.fromString(123))
  t.throws(() => PrivKey.fromString('abc'))
})

test('PrivKey#toBytes() returns a Uint8Array', t => {
  const bytes = t.context.privKey.toBytes()
  t.true(bytes instanceof Uint8Array)
  t.deepEqual(bytes, t.context.privKeyBuf)
})

test('PrivKey#toHex() returns a string', t => {
  const hex = t.context.privKey.toHex()
  t.is(typeof hex, 'string')
  t.is(hex, t.context.privKeyHex)
})

test('PrivKey#toString() returns a bech32m string', t => {
  const str = t.context.privKey.toString()
  t.is(str.length, 63)
  t.deepEqual(str, t.context.privKeyStr)
})

test('PrivKey#toKeyPair() returns a KeyPair', t => {
  const keys = t.context.privKey.toKeyPair()
  t.true(keys instanceof KeyPair)
  t.deepEqual(keys.privKey, t.context.privKey)
})

test('PrivKey#toPubKey() returns a PubKey', t => {
  const pubKey = t.context.privKey.toPubKey()
  t.true(pubKey instanceof PubKey)
})
