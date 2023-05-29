import test from 'ava'
import { Address, KeyPair } from '../dist/index.js'

test.before(t => {
  t.context.keys = KeyPair.fromRandom()
  t.context.addr = Address.fromPubKey(t.context.keys.pubKey)
  t.context.addrStr = t.context.addr.toString()
})

test('Address.fromPubKey() returns an Address with valid PubKey', t => {
  const address = Address.fromPubKey(t.context.keys.pubKey)
  t.true(address instanceof Address)
  t.true(address.hash instanceof Uint8Array)
})

test('Address.fromPubKey() throws with invalid PubKey', t => {
  t.throws(() => Address.fromPubKey(), { message: 'The first argument to `Address.fromPubKey()` must be a `PubKey`' })
  t.throws(() => Address.fromPubKey({}))
  t.throws(() => Address.fromPubKey(123))
  t.throws(() => Address.fromPubKey('abc'))
})

test('Address.fromString() parses string and returns an Address', t => {
  const address = Address.fromString(t.context.addrStr)
  t.deepEqual(address, t.context.addr)
})

test('Address.fromString() throws with invalid string', t => {
  t.throws(() => Address.fromString(undefined))
  t.throws(() => Address.fromString({}))
  t.throws(() => Address.fromString(123))
  t.throws(() => Address.fromString('addr1butnotanaddress'))
})

test('Address#toString() returns address string', t => {
  const address = t.context.addr.toString()
  t.true(typeof address === 'string')
  t.is(address.length, 43)
  t.is(address, t.context.addrStr)
})

