import {
  Storage, StubClock,
  VM
} from '../src/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../src/aldea-crypto.js";
import {base16} from "@aldea/sdk-js";
import {emptyExecFactoryFactory} from "./util.js";

describe('execute with interfaces', () => {
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
    const clock = new StubClock()
    vm = new VM(storage, clock)

    const sources = [
      'runner'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  it('can call an interface method of the same package', () => {
    const exec = emptyExec()
    const pkgIdx = exec.importModule(modIdFor('runner')).asInstance
    const chitaIdx = exec.instantiateByClassName(pkgIdx, 'Chita', []).asJig()
    exec.callInstanceMethod(chitaIdx, 'run', [1])
    const speedStmt = exec.callInstanceMethod(chitaIdx, 'speed', [])
    expect(exec.getStatementResult(speedStmt.idx).value).to.eql(100)
    exec.lockJigToUser(chitaIdx, userAddr)
    const ret = exec.finalize()

    expect(ret.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })

  it('another jig of the same package can call method using an interface', () => {
    const exec = emptyExec()
    const pkgIdx = exec.importModule(modIdFor('runner')).asInstance
    const chitaJig = exec.instantiateByClassName(pkgIdx, 'Chita', []).asJig()
    const tamer = exec.instantiateByClassName(pkgIdx, 'Tamer', [chitaJig]).asJig()
    exec.callInstanceMethod(tamer, 'speedTrain', [])
    exec.lockJigToUser(chitaJig, userAddr)
    exec.lockJigToUser(tamer, userAddr)
    const ret = exec.finalize()

    expect(ret.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })

  it('a caller from another package can call using an interface', () => {
    const exec = emptyExec()
    const pkgIdx = exec.importModule(modIdFor('runner')).asInstance
    const chitaJig = exec.instantiateByClassName(pkgIdx, 'Chita', []).asJig()
    const tamerIdx = exec.instantiateByClassName(pkgIdx, 'Tamer', [chitaJig]).asJig()
    exec.callInstanceMethod(tamerIdx, 'speedTrain', [])
    exec.lockJigToUser(chitaJig, userAddr)
    exec.lockJigToUser(tamerIdx, userAddr)
    const ret = exec.finalize()

    expect(ret.outputs[0].parsedState()).to.eql([[100, 100], 100])
  })

  it('a caller from another package can call using an interface after it was dehidrated and hidrated', () => {
    const exec1 = emptyExec()
    const pkgIdx = exec1.importModule(modIdFor('runner')).asInstance
    const chitaJig = exec1.instantiateByClassName(pkgIdx, 'Chita', []).asJig()
    const tamer = exec1.instantiateByClassName(pkgIdx, 'Tamer', [chitaJig]).asJig()
    exec1.lockJigToUser(chitaJig, userAddr)
    exec1.lockJigToUser(tamer, userAddr)
    const ret1 = exec1.finalize()

    storage.persist(ret1)

    const exec2 = emptyExec([userPriv])
    const loadedTamer = exec2.loadJigByOutputId(ret1.outputs[1].id()).asJig()
    exec2.callInstanceMethod(loadedTamer, 'speedTrain', [])
    exec2.lockJigToUser(loadedTamer, userAddr)
    const ret2 = exec2.finalize()

    expect(ret2.outputs[1].parsedState()).to.eql([[100, 100], 100])
  })
})
