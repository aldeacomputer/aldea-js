import { expect } from 'chai'
import { Low, Memory } from 'lowdb'
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { Aldea, HDPrivKey,  } from "@aldea/sdk-js"
import {buildLowDb, HdWallet, LowDbStorage, WalletData} from "../src/index.js"
import {Wallet} from "../src/wallet.js";


describe('HdWallet', function () {
  let aldea: Aldea
  let wallet: Wallet

  beforeEach(() => {
    const low = buildLowDb(new Memory())
    const storage = new LowDbStorage(low)
    const mnemonic = generateMnemonic(wordlist)
    const seed = mnemonicToSeedSync(mnemonic)
    const hdPrivKey = HDPrivKey.fromSeed(seed)
    aldea = new Aldea('http://localhost')
    wallet = new HdWallet(storage, aldea, hdPrivKey)
  })

  it('get 2 addresses in a row returns different addresses', async () => {
    const addr1 = await wallet.getNextAddress()
    const addr2 = await wallet.getNextAddress()
    expect(addr1).not.to.eql(addr2)
  })
});


//
//
//
// test('get 21 addresses in a row loops', async t => {
//   const wallet = t.context.wallet
//
//   const addresses = new Array(21).map((_) => {
//     return wallet.getNextAddress()
//   })
//   t.deepEqual(addresses[0], addresses[20])
// })
//
