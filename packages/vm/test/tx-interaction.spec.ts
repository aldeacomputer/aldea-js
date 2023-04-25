import {base16, Pointer, PrivKey, ref} from "@aldea/sdk-js";
import {Clock, MemoryStorage, VM} from "../src/index.js";
import {expect} from "chai";
import {ExecutionError, PermissionError} from "../src/errors.js";
import {LockType} from "../src/wasm-instance.js";
import {TxBuilder} from "./tx-builder.js";
import {buildVm} from "./util.js";

describe('tx interaction', () => {
  let storage: MemoryStorage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()
  const fundPriv = PrivKey.fromRandom()
  const fundAddr = fundPriv.toPubKey().toAddress()

  let modIdFor: (key: string) => Uint8Array

  let clock: Clock

  let aCoin: Pointer
  beforeEach(() => {
    const data = buildVm([
      'ant',
      'basic-math',
      'flock',
      'nft',
      'sheep-counter',
      'weapon',
      'forever-counter'
    ])
    storage = data.storage
    vm = data.vm
    clock = data.clock
    modIdFor = data.modIdFor
    aCoin = vm.mint(fundAddr, 1000).currentLocation
  })

  it('can import a module in a tx', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.stateByOrigin(new Pointer(tx.hash, 0))
      .orElse(() => expect.fail('state should be present'))
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

    const state = storage.stateByOrigin(
      new Pointer(tx.hash, 1),
    ).orElse(() => expect.fail('state should be present'))

    expect(state.parsedState()[0]).to.eql(new Pointer(tx.hash, 0).toBytes())
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

    const state = storage.stateByOrigin(
      new Pointer(tx.hash, 0)
    ).orElse(() => expect.fail('state should be present'))

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

    const state = storage.stateByOrigin(
      new Pointer(tx.hash, 1)
    ).orElse(() => expect.fail('state should be present'))

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

    const state = storage.stateByOrigin(new Pointer(tx1.hash, 0))
      .orElse(() => expect.fail('state should be present'))
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

    const state = storage.stateByOrigin(new Pointer(tx1.hash, 0)).orElse(() => expect.fail('state should be present'))
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
      expect(error.message).to.eql(`output not present in utxo set: ${base16.encode(exec1.outputs[0].id())}`)
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

    const state = storage.stateByOutputId(exec2.outputs[0].id()).orElse(() => expect.fail('state should be present'))
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
      expect(e.message).to.eql(`jig ${new Pointer(tx1.hash, 0).toString()} is not allowed to exec "grow"`)
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

    const result = await vm.execTx(tx)

    const deploy = result.deploys[0]
    const module = storage.getRawPackage(deploy.hash).get()
    expect(module.abi.exports[0].code.name).to.eql('Foo')
  })

  it('can exec static methods', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .exec(0, 0, 11, [10])
      .call(1, 1, [])
      .lock(1, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx)

    const state = storage.stateByOrigin(
      new Pointer(tx.hash, 0)
    ).orElse(() => expect.fail('state should be present'))

    expect(state.classIdx).to.eql(0)
    expect(state.parsedState()[0]).to.eql(11) // 10 initial value + 1 grow
  })

  it('can send jigs as parameters to static methods', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .import(modIdFor('sheep-counter'))
      .new(0, 0, [])
      .exec(1, 1, 10, [ref(2)])
      .lock(2, userAddr)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const exec = await vm.execTx(tx)

    expect(exec.outputs[0].origin).to.eql(new Pointer(tx.hash, 0))
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
      expect(error.message).to.eql('Not enough funding. Provided: 0. Needed: 100')
      return
    }
    expect.fail('should have failed because not funded')
  })

  it('freezes the coin that funds the transaction', async () => {
    const coinState = vm.mint(userAddr, 1000)
    const tx = new TxBuilder()
      .load(coinState.id())
      .fund(0)
      .sign(userPriv)
      .build()

    await vm.execTx(tx)
    const coin = storage.stateByOrigin(coinState.origin)
      .orElse(() => expect.fail('should be present'))
    expect(coin.serializedLock.type).to.eql(LockType.FROZEN)
  })

  it('fails if coin does not have 100 units left', async () => {
    const coinState = vm.mint(userAddr, 90)
    const tx = new TxBuilder()
      .load(coinState.id())
      .fund(0)
      .sign(userPriv)
      .build()

    // await vm.execTx(tx)

    try {
      await vm.execTx(tx)
    } catch (e) {
      expect(e).to.be.instanceof(ExecutionError)
      const error = e as ExecutionError
      expect(error.message).to.eql('Not enough funding. Provided: 90. Needed: 100')
      return
    }
    expect.fail('should fail because not enough coins')
  })

  it('can use local location inside tx.', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, []) // not implemented yet
      .lock(1, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const exec = await vm.execTx(tx)

    const tx2 = new TxBuilder()
      .load(exec.outputs[0].id())
      .call(0, 7, []) // not implemented yet
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx2)

    // const result = exec2.getStatementResult(1)
    // expect(result.value).to.eql(exec2.outputs[0].currentLocation.toString())
  })

  it('can use local origin inside tx.', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, []) // not implemented yet
      .lock(1, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const exec = await vm.execTx(tx)

    const tx2 = new TxBuilder()
      .load(exec.outputs[0].id())
      .call(0, 8, []) // not implemented yet
      .lock(0, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx2)

    // const result = exec2.getStatementResult(1)
    // expect(result.value).to.eql(exec2.outputs[0].origin.toString())
  })

  it('can use external origin and location inside tx.', async () => {
    const tx = new TxBuilder()
      .import(modIdFor('flock'))
      .new(0, 0, [])
      .lock(1, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    const exec = await vm.execTx(tx)

    const tx2 = new TxBuilder()
      .load(exec.outputs[0].id()) // load flock
      .import(modIdFor('sheep-counter'))
      .new(1, 1, [ref(0)]) // Shpherd
      .call(2, 7, []) // growFlockUsingInternalTools
      .call(2, 8, []) // growFlockUsingExternalTools
      .lock(2, userAddr)
      .sign(userPriv)
      .fundWith(getLatestCoinLocation(), fundPriv, fundAddr)
      .build()

    await vm.execTx(tx2)
  })
})
