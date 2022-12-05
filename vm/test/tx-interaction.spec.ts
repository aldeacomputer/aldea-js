import {base16, Location, TxBuilder} from "@aldea/sdk-js";
import {Storage, VM} from "../vm/index.js";
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {expect} from "chai";
import {ExecutionError, PermissionError} from "../vm/errors.js";

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

  it('can import a module in a tx', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigState(new Location(tx.hash, 0), () => expect.fail('state should be present'))
    expect(state.className).to.eql('Flock')
  })

  it('can call a method in a tx', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .call(1, 1, [])
      .lock(1, userAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigState(
      new Location(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.className).to.eql('Flock')
  })

  it('can load by location in a tx', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    const tx2 = new TxBuilder()
      .load(new Uint8Array(new Location(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    const tx3 = new TxBuilder()
      .load(new Uint8Array(new Location(tx2.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    await vm.execTx(tx1)
    await vm.execTx(tx2)
    await vm.execTx(tx3)

    const state = storage.getJigState(new Location(tx3.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(2)
  })

  it('can load by origin in a tx', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    const tx2 = new TxBuilder()
      .loadByOrigin(new Uint8Array(new Location(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    const tx3 = new TxBuilder()
      .loadByOrigin(new Uint8Array(new Location(tx2.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    await vm.execTx(tx1)
    await vm.execTx(tx2)
    await vm.execTx(tx3)

    const state = storage.getJigState(new Location(tx3.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(2)
  })

  it('loading by location an expended jig fails', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    const tx2 = new TxBuilder()
      .load(new Uint8Array(new Location(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    const tx3 = new TxBuilder()
      .load(new Uint8Array(new Location(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    await vm.execTx(tx1)
    await vm.execTx(tx2)

    try {
      await vm.execTx(tx3)
      expect.fail('should fail')
    } catch (e) {
      expect(e).to.be.instanceof(ExecutionError)
      const error = e as ExecutionError
      expect(error.message).to.eql('jig already spent')
    }
  })

  it('can accepts partial signatures', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    const tx2 = new TxBuilder()
      .load(new Uint8Array(new Location(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .signTo(userPriv)
      .build()

    await vm.execTx(tx1)
    await vm.execTx(tx2)

    const state = storage.getJigState(new Location(tx2.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(1)
  })

  it('fails when partial signature is not covering the operation that requires the signature', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    const tx2 = new TxBuilder()
      .load(new Uint8Array(new Location(tx1.hash, 0).toBuffer()))
      .signTo(userPriv)
      .call(0, 1, [])
      .lock(0, userAddr)
      .build()

    await vm.execTx(tx1)

    try {
      await vm.execTx(tx2)
      expect.fail('should fail')
    } catch (e: any) {
      expect(e).to.be.instanceof(PermissionError)
      expect(e.message).to.eql(`no permission to remove lock from jig ${base16.encode(tx1.hash)}_o0`)
    }
  })

  it('can deploy', async () => {
    const sourceCode = `
      export class Foo extends Jig {
        prop1: string;
        constructor () {
          super()
          this.prop1 = 'foo'
        }
      }
    `

    const sources = new Map<string, string>()
    sources.set('index.ts', sourceCode)
    const tx = new TxBuilder()
      .deploy('index.ts', sources)
      .build()

    const txExec = await vm.execTx(tx)

    const moduleRes = txExec.getStatementResult(0).instance
    const module = storage.getModule(moduleRes.id)
    expect(module.abi.exports[0].code.name).to.eql('Foo')
  })

  it('can exec static methods', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .exec(0, 0, 5, [10])
      .call(1, 1, [])
      .lock(1, userAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigState(
      new Location(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.className).to.eql('Flock')
    expect(state.parsedState()[0]).to.eql(11) // 10 initial value + 1 grow
  })

  it('fails extract the amount of units from a coin when fund is present', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .fund(1) // not implemented yet
      .call(1, 1, [])
      .lock(1, userAddr)
      .build()

    try {
      await vm.execTx(tx)
      expect.fail('should fail')
    } catch (e) {
      expect(e).to.be.instanceof(ExecutionError)
      const error = e as ExecutionError
      expect(error.message).to.eql('fund not implemented')
    }
  })
})
