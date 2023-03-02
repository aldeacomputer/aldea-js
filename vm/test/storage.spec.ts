import {
  Storage, StubClock,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {base16} from "@aldea/sdk-js";
import {emptyExecFactoryFactory} from "./util.js";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

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
      'flock'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  describe('index by address', function () {
    it('saves new utxos', () => {
      const exec = emptyExec()
      const pkgIndex = exec.importModule(modIdFor('flock'))
      const jigIndex = exec.instantiateByIndex(pkgIndex, 'Flock', [])
      exec.lockJigToUser(jigIndex, userAddr)
      const result = exec.finalize()
      storage.persist(result)

      const utxos = storage.utxosForAddress(userAddr)
      expect(utxos.length).to.eql(1)
      expect(utxos[0].id).to.eql(result.outputs[0].id)
    })

    it('removes old utxos', () => {
      const exec = emptyExec()
      const pkgIndex = exec.importModule(modIdFor('flock'))
      const jigIndex = exec.instantiateByIndex(pkgIndex, 'Flock', [])
      exec.lockJigToUser(jigIndex, userAddr)
      const result = exec.finalize()
      storage.persist(result)

      const exec2 = emptyExec([userPriv])
      const loadedIdx = exec2.loadJigByOutputId(result.outputs[0].id())
      exec2.lockJigToUser(loadedIdx, userAddr)
      const result2 = exec2.finalize()
      storage.persist(result2)

      const utxos = storage.utxosForAddress(userAddr)
      expect(utxos.length).to.eql(1)
      expect(utxos[0].id()).to.eql(result2.outputs[0].id())
    })


    it('acumulates utxos from different txs', () => {
      const exec = emptyExec()
      const pkgIndex = exec.importModule(modIdFor('flock'))
      const jigIndex = exec.instantiateByIndex(pkgIndex, 'Flock', [])
      exec.lockJigToUser(jigIndex, userAddr)
      const result = exec.finalize()
      storage.persist(result)

      const exec2 = emptyExec([userPriv])
      const pkgIndex2 = exec2.importModule(modIdFor('flock'))
      const jigIndex2 = exec2.instantiateByIndex(pkgIndex2, 'Flock', [])
      exec2.lockJigToUser(jigIndex2, userAddr)
      const result2 = exec2.finalize()
      storage.persist(result2)

      const utxos = storage.utxosForAddress(userAddr)
      expect(utxos.length).to.eql(2)
      expect(utxos[0].id()).not.to.eql(utxos[1].id())
      expect(utxos.map(utxo => base16.encode(utxo.id()))).to.have.members([
        base16.encode(result.outputs[0].id()),
        base16.encode(result2.outputs[0].id())
      ])
    })
  });
})
