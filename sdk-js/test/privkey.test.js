import test from 'ava'

import { PrivKey, isPrivKey } from '../dist/privkey.js'
import { KeyPair } from '../dist/keypair.js'
import { PubKey } from '../dist/pubkey.js'

test.before(t => {
  t.context.privKey = PrivKey.fromRandom()
  t.context.privKeyBuf = t.context.privKey.toBytes()
  t.context.privKeyHex = t.context.privKey.toHex()
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

test('PrivKey#toKeyPair() returns a KeyPair', t => {
  const keys = t.context.privKey.toKeyPair()
  t.true(keys instanceof KeyPair)
  t.deepEqual(keys.privKey, t.context.privKey)
})

test('PrivKey#toPubKey() returns a PubKey', t => {
  const pubKey = t.context.privKey.toPubKey()
  t.true(pubKey instanceof PubKey)
})

test('isPrivKey() is true if passed ProvKey', t => {
  t.true(isPrivKey(t.context.privKey))
})

test('isPrivKey() is false if not passed ProvKey', t => {
  t.false(isPrivKey())
  t.false(isPrivKey({}))
  t.false(isPrivKey('123'))
  t.false(isPrivKey(123))
})
