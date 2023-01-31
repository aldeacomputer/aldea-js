import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16, PrivKey, Tx, instructions} from "@aldea/sdk-js";

const { SignInstruction } = instructions

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const moduleIds = new Map<string, string>()
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()

  function modIdFor (key: string): Uint8Array {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return base16.decode(id)
  }

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)

    const sources = [
      'runner'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  function emptyExec (privKeys: PrivKey[] = []): TxExecution {
    const tx = new Tx()
    privKeys.forEach(pk => {
      const sig = tx.createSignature(pk)
      tx.push(new SignInstruction(sig, pk.toPubKey().toBytes()))
    })
    const exec = new TxExecution(tx, vm)
    exec.markAsFunded()
    return exec
  }

  it('can call an interface method of the same package', () => {
    const exec = emptyExec()
    const pkgIdx = exec.importModule(modIdFor('runner'))
    const chitaIdx = exec.instantiate(pkgIdx, 'Chita', [])
    exec.callInstanceMethodByIndex(chitaIdx, 'run', [1])
    const speedIdx = exec.callInstanceMethodByIndex(chitaIdx, 'speed', [])
    expect(exec.getStatementResult(speedIdx).value).to.eql(100)
    exec.lockJigToUser(chitaIdx, userAddr)
    exec.finalize()

    expect(exec.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })

  it('another jig of the same package can call method using an interface', () => {
    const exec = emptyExec()
    const pkgIdx = exec.importModule(modIdFor('runner'))
    const chitaIdx = exec.instantiate(pkgIdx, 'Chita', [])
    const chitaJig = exec.getStatementResult(chitaIdx).asJig()
    const tamerIdx = exec.instantiate(pkgIdx, 'Tamer', [chitaJig])
    exec.callInstanceMethodByIndex(tamerIdx, 'speedTrain', [])
    exec.lockJigToUser(chitaIdx, userAddr)
    exec.lockJigToUser(tamerIdx, userAddr)
    exec.finalize()

    expect(exec.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })

  it('a caller from another package can call using an interface', () => {
    const exec = emptyExec()
    const pkgIdx = exec.importModule(modIdFor('runner'))
    const chitaIdx = exec.instantiate(pkgIdx, 'Chita', [])
    const chitaJig = exec.getStatementResult(chitaIdx).asJig()
    const tamerIdx = exec.instantiate(pkgIdx, 'Tamer', [chitaJig])
    exec.callInstanceMethodByIndex(tamerIdx, 'speedTrain', [])
    exec.lockJigToUser(chitaIdx, userAddr)
    exec.lockJigToUser(tamerIdx, userAddr)
    exec.finalize()

    expect(exec.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })

  it('a caller from another package can call using an interface after it was dehidrated and hidrated', () => {
    const exec1 = emptyExec()
    const pkgIdx = exec1.importModule(modIdFor('runner'))
    const chitaIdx = exec1.instantiate(pkgIdx, 'Chita', [])
    const chitaJig = exec1.getStatementResult(chitaIdx).asJig()
    const tamerIdx = exec1.instantiate(pkgIdx, 'Tamer', [chitaJig])
    exec1.lockJigToUser(chitaIdx, userAddr)
    exec1.lockJigToUser(tamerIdx, userAddr)
    exec1.finalize()

    storage.persist(exec1)

    const exec2 = emptyExec([userPriv])
    // const loadedChitaIdx = exec2.loadJigByOutputId(exec1.outputs[0].id())
    const loadedTamerIdx = exec2.loadJigByOutputId(exec1.outputs[1].id())
    exec2.callInstanceMethodByIndex(loadedTamerIdx, 'speedTrain', [])
    // exec2.lockJigToUser(chitaIdx, userAddr)
    exec2.lockJigToUser(loadedTamerIdx, userAddr)
    exec2.finalize()

    expect(exec2.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })
})