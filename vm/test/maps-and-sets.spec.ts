import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16, PrivKey, Tx, instructions, ref} from "@aldea/sdk-js";

const {SignInstruction} = instructions

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
    vm = new VM(storage)

    const sources = [
      'maps-and-sets'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  function emptyExec(privKeys: PrivKey[] = []): TxExecution {
    const tx = new Tx()
    privKeys.forEach(pk => {
      const sig = tx.createSignature(pk)
      tx.push(new SignInstruction(sig, pk.toPubKey().toBytes()))
    })
    const exec = new TxExecution(tx, vm)
    exec.markAsFunded()
    return exec
  }


  it('can be lift and lower maps multiple times', () => {
    const exec1 = emptyExec()
    const modIdx = exec1.importModule(modIdFor('maps-and-sets'))
    const jigIdx1 = exec1.instantiate(modIdx, 'JigMap', [])
    exec1.lockJigToUser(jigIdx1, userAddr)
    exec1.markAsFunded()
    exec1.finalize()
    storage.persist(exec1)

    const exec2 = emptyExec([userPriv])
    const jigIdx2 = exec2.loadJigByOutputId(exec1.outputs[0].id())
    exec2.callInstanceMethodByIndex(jigIdx2, 'add', ['key1', 'value1'])
    exec2.finalize()
    storage.persist(exec2)

    const exec3 = emptyExec([userPriv])
    const jigIdx3 = exec3.loadJigByOutputId(exec2.outputs[0].id())
    exec3.callInstanceMethodByIndex(jigIdx3, 'add', ['key2', 'value2'])
    exec3.finalize()

    const state = exec3.outputs[0].parsedState()
    const map = new Map<string, string>()
    map.set('key1', 'value1')
    map.set('key2', 'value2')
    expect(state[0]).to.eql(map)
  })

  it('works with jigs as keys and jigs as values', () => {
    const exec = emptyExec()
    const modIdx = exec.importModule(modIdFor('maps-and-sets'))
    const keyIdx = exec.instantiate(modIdx, 'JigKey', [])
    const valueIdx = exec.instantiate(modIdx, 'JigValue', [])
    const mapIdx = exec.instantiate(modIdx, 'JigToJigMap', [])
    exec.callInstanceMethodByIndex(mapIdx, 'add', [ref(keyIdx), ref(valueIdx)])
    exec.lockJigToUser(mapIdx, userAddr)
    exec.markAsFunded()
    exec.finalize()

    const state = exec.outputs[2].parsedState()
    expect(state[0]).to.have.length(1)
    const map: Map<Uint8Array, Uint8Array> = state[0]
    const key = map.keys().next().value
    const value = map.values().next().value
    expect(key).to.eql(exec.outputs[0].origin.toBytes())
    expect(value).to.eql(exec.outputs[1].origin.toBytes())
  })
})
