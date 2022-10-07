import test from 'ava'
import { wordlist } from '@scure/bip39/wordlists/english.js'

import { HDKey, isHDKey } from '../dist/hdkey.js'
import { generateMnemonic, mnemonicToSeed } from '../dist/support/mnemonic.js'
import { HDNode } from '../dist/support/ed25519.js'
import { PrivKey } from '../dist/privkey.js'
import { PubKey } from '../dist/pubkey.js'

test.before(t => {
  t.context.words = generateMnemonic(wordlist)
  t.context.seed = mnemonicToSeed(t.context.words)
  t.context.key = HDKey.fromSeed(t.context.seed)
})

test('HDKey.fromSeed() returns an HDKey with valid seed', t => {
  const key = HDKey.fromSeed(t.context.seed)
  t.true(key instanceof HDKey)
  t.true(key.node instanceof HDNode)
  t.true(key.privKey instanceof PrivKey)
  t.true(key.pubKey instanceof PubKey)
})

test('HDKey.fromSeed() throws with seed too short', t => {
  t.throws(() => HDKey.fromSeed(new Uint8Array([1,2,3,4,5])), { message: /^HDKey: wrong seed length/ })
})

test('HDKey.fromSeed() throws with invalid seed', t => {
  t.throws(() => HDKey.fromSeed(), { message: 'Expected Uint8Array' })
  t.throws(() => HDKey.fromSeed({}))
  t.throws(() => HDKey.fromSeed(123))
  t.throws(() => HDKey.fromSeed('abc'))
})

test('HDKey#derive() returns a derived HDKey with valid path', t => {
  const key = t.context.key.derive('M/0/1')
  t.true(key instanceof HDKey)
})

test('HDKey#derive() throws with an invalid path', t => {
  t.throws(() => t.context.key.derive('1/2/3'), { message: 'Path must start with "m" or "M"' })
  t.throws(() => t.context.key.derive())
  t.throws(() => t.context.key.derive({}))
  t.throws(() => t.context.key.derive(123))
})

test('isHDKey() is true if passed HDKey', t => {
  t.true(isHDKey(t.context.key))
})

test('isHDKey() is false if not passed HDKey', t => {
  t.false(isHDKey())
  t.false(isHDKey({}))
  t.false(isHDKey('123'))
  t.false(isHDKey(123))
})
