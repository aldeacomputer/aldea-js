import {
  Storage,
  VM
} from '../src/index.js'
import {expect} from 'chai'
import {buildVm, emptyExecFactoryFactory} from "./util.js";
import {PrivKey} from "@aldea/core";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let modIdFor: (key: string) => Uint8Array

  beforeEach(() => {
    const data = buildVm(['maps-and-sets'])
    vm = data.vm
    storage = data.storage
    modIdFor = data.modIdFor
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  it('can be lift and lower maps multiple times', () => {
    const exec1 = emptyExec()
    const pkg = exec1.importModule(modIdFor('maps-and-sets')).asInstance
    const jig1 = exec1.instantiateByClassName(pkg, 'JigMap', []).asJig()
    exec1.lockJigToUser(jig1, userAddr)
    exec1.markAsFunded()
    const ret1 = exec1.finalize()
    storage.persist(ret1)

    const exec2 = emptyExec([userPriv])
    const jig2 = exec2.loadJigByOutputId(ret1.outputs[0].id()).asJig()
    exec2.callInstanceMethod(jig2, 'add', ['key1', 'value1'])
      const ret2 = exec2.finalize()
    storage.persist(ret2)

    const exec3 = emptyExec([userPriv])
    const jigIdx3 = exec3.loadJigByOutputId(ret2.outputs[0].id()).asJig()
    exec3.callInstanceMethod(jigIdx3, 'add', ['key2', 'value2'])
      const ret3 = exec3.finalize()

    const state = ret3.outputs[0].parsedState(pkg.abi.abi)
    const map = new Map<string, string>()
    map.set('key1', 'value1')
    map.set('key2', 'value2')
    expect(state[0]).to.eql(map)
  })

  it('works with jigs as keys and jigs as values', () => {
    const exec = emptyExec()
    const pkg = exec.importModule(modIdFor('maps-and-sets')).asInstance
    const keyJig = exec.instantiateByClassName(pkg, 'JigKey', []).asJig()
    const valueJig = exec.instantiateByClassName(pkg, 'JigValue', []).asJig()
    const mapIdx = exec.instantiateByClassName(pkg, 'JigToJigMap', []).asJig()
    exec.callInstanceMethod(mapIdx, 'add', [keyJig, valueJig])
      exec.lockJigToUser(mapIdx, userAddr)
    exec.markAsFunded()
    const ret = exec.finalize()

    const state = ret.outputs[2].parsedState(pkg.abi.abi)
    expect(state[0]).to.have.length(1)
    const map: Map<Uint8Array, Uint8Array> = state[0]
    const key = map.keys().next().value
    const value = map.values().next().value
    expect(key).to.eql(ret.outputs[0].origin)
    expect(value).to.eql(ret.outputs[1].origin)
  })
})
