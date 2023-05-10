import {
  Storage,
  VM
} from '../src/index.js'
import {expect} from 'chai'
import {buildVm, emptyExecFactoryFactory} from "./util.js";
import {PrivKey} from "@aldea/sdk-js";

describe('execute with interfaces', () => {
  let storage: Storage
  let vm: VM

  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let modIdFor: (key: string) => Uint8Array

  beforeEach(() => {
    const data = buildVm(['runner'])
    vm = data.vm
    storage = data.storage
    modIdFor = data.modIdFor
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

    expect(ret.outputs[0].parsedState(pkgIdx.abi.abi)).to.eql([[100, 100], 100])
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

    expect(ret.outputs[0].parsedState(pkgIdx.abi.abi)).to.eql([[100, 100], 100])
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

    expect(ret.outputs[0].parsedState(pkgIdx.abi.abi)).to.eql([[100, 100], 100])
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

    expect(ret2.outputs[1].parsedState(pkgIdx.abi.abi)).to.eql([[100, 100], 100])
  })
})
