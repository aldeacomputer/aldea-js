import {base16, Pointer, ref} from "@aldea/sdk-js";
import {Storage, VM} from "../vm/index.js";
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {expect} from "chai";
import {ExecutionError, PermissionError} from "../vm/errors.js";
import {TxBuilder} from "./tx-builder.js";

describe('tx interaction', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const fundPriv = AldeaCrypto.randomPrivateKey()
  const fundAddr = fundPriv.toPubKey().toAddress()
  const moduleIds = new Map<string, string>()

  function modIdFor (key: string): string {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return id
  }

  let aCoin: Pointer
  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)
    aCoin = vm.mint(fundAddr, 1000).currentLocation

    const sources = [
      'ant',
      'basic-math',
      'flock',
      'nft',
      'sheep-counter',
      'weapon',
      'forever-counter'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  it('can import a module in a tx', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigStateByOrigin(new Pointer(tx.hash, 0), () => expect.fail('state should be present'))
    expect(state.classIdx).to.eql(0)
  })

  it('can create an instance sending a jig as a parameter', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .import(modIdFor('sheep-counter'))
      .new(0, 0, [])
      .new(1, 1, [ref(2)])
      .lock(3, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigStateByOrigin(
      new Pointer(tx.hash, 1),
      () => expect.fail('state should be present')
    )

    expect(state.parsedState()[0]).to.eql({name: 'Flock', originBuf: new Pointer(tx.hash, 0).toBytes()})
  })

  it('can call a method in a tx', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .call(1, 1, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigStateByOrigin(
      new Pointer(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.classIdx).to.eql(0)
  })

  it('can send a jig as parameter to a method', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .import(modIdFor('sheep-counter'))
      .new(0, 0, [])
      .new(1, 0, [])
      .call(2, 1, [])
      .call(3, 2, [ref(2)])
      .lock(2, userAddr)
      .lock(3, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigStateByOrigin(
      new Pointer(tx.hash, 1),
      () => expect.fail('state should be present')
    )

    expect(state.parsedState()[0]).to.eql(1)
    expect(state.parsedState()[1]).to.eql(4)
  })


  function getLatestCoinLocation(): Uint8Array {
    return storage.tipFor(aCoin)
  }

  it('can load by location in a tx', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    const exec1 = await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(exec1.outputs[0].id())
      .call(0, 1, [])
      .lock(0, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .sign(userPriv)
      .build()
    const exec2 = await vm.execTx(tx2)

    const tx3 = new TxBuilder()
      .load(exec2.outputs[0].id())
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx3)

    const state = storage.getJigStateByOrigin(new Pointer(tx1.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(2)
  })

  it('can load by origin in a tx', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .loadByOrigin(new Uint8Array(new Pointer(tx1.hash, 0).toBytes()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx2)

    const tx3 = new TxBuilder()
      .loadByOrigin(new Uint8Array(new Pointer(tx1.hash, 0).toBytes()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx3)

    const state = storage.getJigStateByOrigin(new Pointer(tx1.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(2)
  })

  it('loading by location a spent jig fails', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    const exec1 = await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(exec1.outputs[0].id())
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx2)

    const tx3 = new TxBuilder()
      .load(exec1.outputs[0].id())
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    try {
      await vm.execTx(tx3)
    } catch (e) {
      expect(e).to.be.instanceof(ExecutionError)
      const error = e as ExecutionError
      expect(error.message).to.eql('jig already spent')
      return
    }
    expect.fail('should fail')
  })

  it('can accepts partial signatures', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    const exec1 = await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(exec1.outputs[0].id())
      .call(0, 1, [])
      .lock(0, userAddr)
      .signTo(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const exec2 = await vm.execTx(tx2)

    const state = storage.getJigStateByOutputId(exec2.outputs[0].id(), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(1)
  })

  it('fails when partial signature is not covering the operation that requires the signature', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    const exec1 = await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(exec1.outputs[0].id())
      .signTo(userPriv)
      .call(0, 1, [])
      .lock(0, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    try {
      await vm.execTx(tx2)
    } catch (e: any) {
      expect(e).to.be.instanceof(PermissionError)
      expect(e.message).to.eql(`jig ${new Pointer(tx1.hash, 0).toString()} is not allowed to exec "Flock$grow"`)
      return
    }
    expect.fail('should fail')
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
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const txExec = await vm.execTx(tx)

    const moduleRes = txExec.getStatementResult(0).instance
    const module = storage.getModule(moduleRes.id)
    expect(module.abi.exports[0].code.name).to.eql('Foo')
  })

  it('can exec static methods', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .exec(0, 0, 7, [10])
      .call(1, 1, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigStateByOrigin(
      new Pointer(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.classIdx).to.eql(0)
    expect(state.parsedState()[0]).to.eql(11) // 10 initial value + 1 grow
  })

  it('can send jigs as parameters to static methods', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .import(modIdFor('sheep-counter'))
      .new(0, 0, [])
      .exec(1, 1, 7, [ref(2)])
      .lock(2, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const exec = await vm.execTx(tx)

    expect(exec.getStatementResult(3).asJig().origin).to.eql(new Pointer(tx.hash, 0))
  })

  it('tx fails if not funded', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .build()

    try {
      await vm.execTx(tx)
    } catch (e) {
      expect(e).to.be.instanceof(ExecutionError)
      const error = e as ExecutionError
      expect(error.message).to.eql('tx not funded')
      return
    }
    expect.fail('should have failed because not funded')
  })

  it('extracts 100 of units from a coin when fund is present', async () => {
    const coinState = vm.mint(userAddr, 1000)
    const tx = new TxBuilder()
      .load(coinState.id())
      .fund(0) // not implemented yet
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    await vm.execTx(tx)
    const coin = storage.getJigStateByOrigin(coinState.origin, () => expect.fail('should be present'))
    const parsed = coin.parsedState()
    expect(parsed[0]).to.eql(900)
  })

  it('fails if coin does not have 100 units left', async () => {
    const coinState = vm.mint(userAddr, 90)
    const tx = new TxBuilder()
      .load(coinState.id())
      .fund(0) // not implemented yet
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    try {
      await vm.execTx(tx)
    } catch (e) {
      expect(e).to.be.instanceof(ExecutionError)
      const error = e as ExecutionError
      expect(error.message).to.eql('not enough coins')
      return
    }
    expect.fail('should fail because not enough coins')
  })
})
