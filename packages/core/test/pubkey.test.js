import test from 'ava'
import { Address } from '../dist/address.js'
import { PubKey } from '../dist/pubkey.js'
import { PrivKey } from '../dist/privkey.js'

test.before(t => {
  t.context.privKey = PrivKey.fromRandom()
  t.context.pubKey = t.context.privKey.toPubKey()
  t.context.pubKeyBuf = t.context.pubKey.toBytes()
  t.context.pubKeyHex = t.context.pubKey.toHex()
  t.context.pubKeyStr = t.context.pubKey.toString()
})

test('PubKey.fromPrivKey() returns a PubKey with valid PrivKey', t => {
  const key = PubKey.fromPrivKey(t.context.privKey)
  t.true(key instanceof PubKey)
  t.deepEqual(key, t.context.pubKey)
  t.true(typeof key.x === 'bigint')
  t.true(typeof key.y === 'bigint')
})

test('PubKey.fromPrivKey() throws with invalid PrivKey', t => {
  t.throws(() => PubKey.fromPrivKey(), { message: 'The first argument to `PubKey.fromPrivKey()` must be a `PrivKey`' })
  t.throws(() => PubKey.fromPrivKey({}))
  t.throws(() => PubKey.fromPrivKey(123))
  t.throws(() => PubKey.fromPrivKey('abc'))
})

test('PubKey.fromBytes() returns a PubKey with valid bytes', t => {
  const key = PubKey.fromBytes(t.context.pubKeyBuf)
  t.true(key instanceof PubKey)
  t.true(key.equals(t.context.pubKey))
})

test('PubKey.fromBytes() throws with incorrect bytes length', t => {
  t.throws(() => PubKey.fromBytes(new Uint8Array(5)))
  t.throws(() => PubKey.fromBytes(new Uint8Array(35)))
})

test('PubKey.fromBytes() throws with invalid bytes', t => {
  t.throws(() => PubKey.fromBytes(), { message: 'The first argument to `PubKey.fromBytes()` must be a `Uint8Array`' })
  t.throws(() => PubKey.fromBytes({}))
  t.throws(() => PubKey.fromBytes(123))
  t.throws(() => PubKey.fromBytes('abc'))
})

test('PubKey.fromHex() returns a PubKey', t => {
  const key = PubKey.fromHex(t.context.pubKeyHex)
  t.true(key instanceof PubKey)
  t.true(key.equals(t.context.pubKey))
})

test('PubKey.fromHex() throws with invalid hex', t => {
  t.throws(() => PubKey.fromHex(), { message: 'The first argument to `PubKey.fromHex()` must be a `string`' })
  t.throws(() => PubKey.fromHex({}))
  t.throws(() => PubKey.fromHex(123))
  t.throws(() => PubKey.fromHex('abc'))
})

test('PubKey#toBytes() returns a Uint8Array', t => {
  const bytes = t.context.pubKey.toBytes()
  t.true(bytes instanceof Uint8Array)
  t.deepEqual(bytes, t.context.pubKeyBuf)
})

test('PubKey#toHex() returns a string', t => {
  const hex = t.context.pubKey.toHex()
  t.is(typeof hex, 'string')
  t.is(hex, t.context.pubKeyHex)
})

test('PubKey#toAddress() returns n Address', t => {
  const address = t.context.pubKey.toAddress()
  t.true(address instanceof Address)
})

test('PubKey.fromString() returns a PubKey with valid string', t => {
  const key = PubKey.fromString(t.context.pubKeyStr)
  t.true(key instanceof PubKey)
  t.deepEqual({ x: key.x, y: key.y }, { x: t.context.pubKey.x, y: t.context.pubKey.y })
})

test('PubKey.fromString() throws with invalid string', t => {
  t.throws(() => PubKey.fromString('apub1notapubkey'))
  t.throws(() => PubKey.fromString())
  t.throws(() => PubKey.fromString({}))
  t.throws(() => PubKey.fromString(123))
  t.throws(() => PubKey.fromString('abc'))
})

test('PubKey#toString() returns a bech32m string', t => {
  const str = t.context.pubKey.toString()
  t.is(str.length, 63)
  t.deepEqual(str, t.context.pubKeyStr)
})
