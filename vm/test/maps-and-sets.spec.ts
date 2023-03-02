import {
  Storage, StubClock,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {base16, ref} from "@aldea/sdk-js";
import moment from "moment";
import {emptyExecFactoryFactory} from "./util.js";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

  function modIdFor(key: string): Uint8Array {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return base16.decode(id)
  }

  beforeEach(() => {
    storage = new Storage()
    const clock = new StubClock(moment())
    vm = new VM(storage, clock)

    const sources = [
      'maps-and-sets'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  it('can be lift and lower maps multiple times', () => {
    const exec1 = emptyExec()
    const modIdx = exec1.importModule(modIdFor('maps-and-sets'))
    const jigIdx1 = exec1.instantiateByIndex(modIdx, 'JigMap', [])
    exec1.lockJigToUser(jigIdx1, userAddr)
    exec1.markAsFunded()
    const ret1 = exec1.finalize()
    storage.persist(ret1)

    const exec2 = emptyExec([userPriv])
    const jigIdx2 = exec2.loadJigByOutputId(ret1.outputs[0].id())
    exec2.callInstanceMethodByIndex(jigIdx2, 'add', ['key1', 'value1'])
    const ret2 = exec2.finalize()
    storage.persist(ret2)

    const exec3 = emptyExec([userPriv])
    const jigIdx3 = exec3.loadJigByOutputId(ret2.outputs[0].id())
    exec3.callInstanceMethodByIndex(jigIdx3, 'add', ['key2', 'value2'])
    const ret3 = exec3.finalize()

    const state = ret3.outputs[0].parsedState()
    const map = new Map<string, string>()
    map.set('key1', 'value1')
    map.set('key2', 'value2')
    expect(state[0]).to.eql(map)
  })

  it('works with jigs as keys and jigs as values', () => {
    const exec = emptyExec()
    const modIdx = exec.importModule(modIdFor('maps-and-sets'))
    const keyIdx = exec.instantiateByIndex(modIdx, 'JigKey', [])
    const valueIdx = exec.instantiateByIndex(modIdx, 'JigValue', [])
    const mapIdx = exec.instantiateByIndex(modIdx, 'JigToJigMap', [])
    exec.callInstanceMethodByIndex(mapIdx, 'add', [ref(keyIdx), ref(valueIdx)])
    exec.lockJigToUser(mapIdx, userAddr)
    exec.markAsFunded()
    const ret = exec.finalize()

    const state = ret.outputs[2].parsedState()
    expect(state[0]).to.have.length(1)
    const map: Map<Uint8Array, Uint8Array> = state[0]
    const key = map.keys().next().value
    const value = map.values().next().value
    expect(key).to.eql(ret.outputs[0].origin.toBytes())
    expect(value).to.eql(ret.outputs[1].origin.toBytes())
  })
})
