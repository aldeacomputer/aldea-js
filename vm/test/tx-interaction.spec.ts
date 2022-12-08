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

  let aCoin: Location
  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)
    aCoin = vm.mint(fundAddr, 1000)

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

    const state = storage.getJigState(Location.fromData(tx.hash, 0), () => expect.fail('state should be present'))
    expect(state.classIdx).to.eql(0)
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

    const state = storage.getJigState(
      Location.fromData(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.classIdx).to.eql(0)
  })

  function getLatestCoinLocation(): Uint8Array {
    const tip = storage.tipFor(aCoin)
    return tip.toUintArray();
  }

  it('can load by location in a tx', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(new Uint8Array(Location.fromData(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .sign(userPriv)
      .build()
    await vm.execTx(tx2)

    const tx3 = new TxBuilder()
      .load(new Uint8Array(Location.fromData(tx2.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx3)

    const state = storage.getJigState(Location.fromData(tx3.hash, 0), () => expect.fail('state should be present'))
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
      .loadByOrigin(new Uint8Array(Location.fromData(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx2)

    const tx3 = new TxBuilder()
      .loadByOrigin(new Uint8Array(Location.fromData(tx2.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx3)

    const state = storage.getJigState(Location.fromData(tx3.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(2)
  })

  it('loading by location an expended jig fails', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(new Uint8Array(Location.fromData(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const tx3 = new TxBuilder()
      .load(new Uint8Array(Location.fromData(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
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
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(new Uint8Array(Location.fromData(tx1.hash, 0).toBuffer()))
      .call(0, 1, [])
      .lock(0, userAddr)
      .signTo(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx2)

    const state = storage.getJigState(Location.fromData(tx2.hash, 0), () => expect.fail('state should be present'))
    expect(state.parsedState()[0]).to.eql(1)
  })

  it('fails when partial signature is not covering the operation that requires the signature', async () => {
    const tx1 = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()
    await vm.execTx(tx1)

    const tx2 = new TxBuilder()
      .load(new Uint8Array(Location.fromData(tx1.hash, 0).toBuffer()))
      .signTo(userPriv)
      .call(0, 1, [])
      .lock(0, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    try {
      await vm.execTx(tx2)
    } catch (e: any) {
      expect(e).to.be.instanceof(PermissionError)
      expect(e.message).to.eql(`jig ${Location.fromData(tx1.hash, 0).toString()} is not allowed to exec "Flock$grow"`)
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
      .exec(0, 0, 6, [10])
      .call(1, 1, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.getJigState(
      Location.fromData(tx.hash, 0),
      () => expect.fail('state should be present')
    )

    expect(state.classIdx).to.eql(0)
    expect(state.parsedState()[0]).to.eql(11) // 10 initial value + 1 grow
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
    const loc = vm.mint(userAddr, 1000)
    const tx = new TxBuilder()
      .load(new Uint8Array(loc.toBuffer()))
      .fund(0) // not implemented yet
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    await vm.execTx(tx)
    const coin = storage.getJigState(Location.fromData(tx.hash, 0), () => expect.fail('should be present'))
    const parsed = coin.parsedState()
    expect(parsed[0]).to.eql(900)
  })


  it('extracts 100 of units from a coin when fund is present', async () => {
    const loc = vm.mint(userAddr, 1000)
    const tx = new TxBuilder()
      .load(new Uint8Array(loc.toBuffer()))
      .fund(0) // not implemented yet
      .lock(0, userAddr)
      .sign(userPriv)
      .build()

    await vm.execTx(tx)
    const coin = storage.getJigState(Location.fromData(tx.hash, 0), () => expect.fail('should be present'))
    const parsed = coin.parsedState()
    expect(parsed[0]).to.eql(900)
  })

  it('fails if coin does not have 100 units left', async () => {
    const loc = vm.mint(userAddr, 90)
    const tx = new TxBuilder()
      .load(new Uint8Array(loc.toBuffer()))
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
