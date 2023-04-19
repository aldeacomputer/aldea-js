import test from 'ava'
import { Low, Memory } from 'lowdb'
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { Aldea, HDPrivKey, LowDbStorage } from "../dist/index.js"
import { mockAldea } from "./test-helpers.js"

test.before(t => {
  const storage = new LowDbStorage(new Low(new Memory()))
  const mnemonic = generateMnemonic(wordlist)
  const seed = mnemonicToSeedSync(mnemonic)
  const hdPrivKey = HDPrivKey.fromSeed(seed)
  t.context.aldea = new Aldea('http://localhost')
  t.context.wallet = new HdWallet(storage, t.context.aldea, hdPrivKey)
})

test('get 2 addresses in a row returns different addresses', async t => {
  const wallet = t.context.wallet
  const addr1 = await wallet.getNextAddress()
  const addr2 = await wallet.getNextAddress()
  t.notDeepEqual(addr1, addr2)
})


test('get 21 addresses in a row loops', async t => {
  const wallet = t.context.wallet

  const addresses = new Array(21).map((_) => {
    return wallet.getNextAddress()
  })
  t.deepEqual(addresses[0], addresses[20])
})

