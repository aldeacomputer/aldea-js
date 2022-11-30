import {Location, TxBuilder} from "@aldea/sdk-js";
import {Storage, VM} from "../vm/index.js";
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {expect} from "chai";

describe('tx interaction', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

  function modIdFor (key: string): string {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return id
  }

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)

    const sources = [
      'ant',
      'basic-math',
      'flock',
      'nft',
      'remote-control',
      'sheep-counter',
      'tv',
      'weapon',
      'forever-counter'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, id)
    })
  })

  it('can import a module in a tx', () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    vm.execTx(tx)

    const state = storage.getJigState(new Location(tx.hash, 0), () => expect.fail('state should be present'))
    expect(state.className).to.eql('Flock')
  })

  it('can call a method in a tx', () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .call(1, 1, [])
      .lock(1, userAddr)
      .build()

    vm.execTx(tx)

    const state = storage.getJigState(
      new Location(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.className).to.eql('Flock')
  })
})
