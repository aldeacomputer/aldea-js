import test from 'ava'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { generateMnemonic, mnemonicToSeed } from '../../dist/support/mnemonic.js'

test.before(t => {
  t.context.words = generateMnemonic(wordlist)
})

test('generateMnemonic() creates a random seed from the given worldlist',t  => {
  const words = generateMnemonic(wordlist)
  t.true(typeof words === 'string')
  t.is(words.split(' ').length, 12)
})

test('generateMnemonic() creates a 15 word seed',t  => {
  const words = generateMnemonic(wordlist, 160)
  t.is(words.split(' ').length, 15)
})

test('generateMnemonic() creates a 24 word seed',t  => {
  const words = generateMnemonic(wordlist, 256)
  t.is(words.split(' ').length, 24)
})

test('generateMnemonic() throws if wordlist is too short', t => {
  t.throws(() => generateMnemonic(['foo', 'bar', 'baz']), { message: /expected array of 2048 strings/ })
})

test('generateMnemonic() throws if wordlist is invalid', t => {
  t.throws(() => generateMnemonic(), { message: /expected array of 2048 strings/ })
  t.throws(() => generateMnemonic(1))
  t.throws(() => generateMnemonic({}))
  t.throws(() => generateMnemonic('abc'))
})

test('generateMnemonic() throws if length is invalid', t => {
  t.throws(() => generateMnemonic(wordlist, 99), { message: /Invalid entropy/ })
  t.throws(() => generateMnemonic(wordlist, 'abc'), { message: /Wrong positive integer/ })
  t.throws(() => generateMnemonic(wordlist, {}), { message: /Wrong positive integer/ })
})

test('mnemonicToSeed() returns 64 byte seed', t => {
  const seed = mnemonicToSeed(t.context.words)
  t.true(seed instanceof Uint8Array)
  t.is(seed.length, 64)
})

test('mnemonicToSeed() throws with invalid words', t => {
  t.throws(() => mnemonicToSeed(), { message: /Invalid mnemonic/ })
  t.throws(() => mnemonicToSeed(1), { message: /Invalid mnemonic/ })
  t.throws(() => mnemonicToSeed({}), { message: /Invalid mnemonic/ })
  t.throws(() => mnemonicToSeed('abc'), { message: /Invalid mnemonic/ })
})
