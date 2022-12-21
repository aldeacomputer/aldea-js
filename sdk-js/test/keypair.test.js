import test from 'ava'

import { KeyPair } from '../dist/keypair.js'
import { PrivKey } from '../dist/privkey.js'
import { PubKey } from '../dist/pubkey.js'

test.before(t => {
  t.context.privKey = PrivKey.fromRandom()
})

test('KeyPair.fromRandom() returns a new KeyPair', t => {
  const key = KeyPair.fromRandom()
  t.true(key instanceof KeyPair)
  t.true(key.privKey instanceof PrivKey)
  t.true(key.pubKey instanceof PubKey)
})

test('KeyPair.fromPrivKey() returns a KeyPair', t => {
  const key = KeyPair.fromPrivKey(t.context.privKey)
  t.true(key instanceof KeyPair)
  t.deepEqual(key.privKey, t.context.privKey)
})

test('KeyPair.fromPrivKey() throws with invalid PrivKey', t => {
  t.throws(() => KeyPair.fromPrivKey(), { message: 'The first argument to `KeyPair.fromPrivKey()` must be a `PrivKey`' })
  t.throws(() => KeyPair.fromPrivKey({}))
  t.throws(() => KeyPair.fromPrivKey(123))
  t.throws(() => KeyPair.fromPrivKey('abc'))
})
