import {
  Storage,
  VM
} from '../src/index.js'
import {expect} from 'chai'
import {base16, PrivKey} from "@aldea/sdk-js";
import {buildVm, emptyExecFactoryFactory} from "./util.js";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let modIdFor: (key: string) => Uint8Array

  beforeEach(() => {
    let data = buildVm(['flock'])
    storage = data.storage
    vm = data.vm
    modIdFor = data.modIdFor
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  describe('index by address', function () {
    it('saves new utxos', () => {
      const exec = emptyExec()
      const pkg = exec.importModule(modIdFor('flock')).asInstance
      const jig = exec.instantiateByClassName(pkg, 'Flock', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      const result = exec.finalize()
      storage.persist(result)

      const utxos = storage.utxosForAddress(userAddr)
      expect(utxos.length).to.eql(1)
      expect(utxos[0].id).to.eql(result.outputs[0].id)
    })

    it('removes old utxos', () => {
      const exec = emptyExec()
      const pkgIndex = exec.importModule(modIdFor('flock')).asInstance
      const jig = exec.instantiateByClassName(pkgIndex, 'Flock', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      const result = exec.finalize()
      storage.persist(result)

      const exec2 = emptyExec([userPriv])
      const loaded = exec2.loadJigByOutputId(result.outputs[0].id()).asJig()
      exec2.lockJigToUser(loaded, userAddr)
      const result2 = exec2.finalize()
      storage.persist(result2)

      const utxos = storage.utxosForAddress(userAddr)
      expect(utxos.length).to.eql(1)
      expect(utxos[0].id()).to.eql(result2.outputs[0].id())
    })


    it('acumulates utxos from different txs', () => {
      const exec = emptyExec()
      const pkgIndex = exec.importModule(modIdFor('flock')).asInstance
      const jig = exec.instantiateByClassName(pkgIndex, 'Flock', []).asJig()
      exec.lockJigToUser(jig, userAddr)
      const result = exec.finalize()
      storage.persist(result)

      const exec2 = emptyExec([userPriv])
      const pkgIndex2 = exec2.importModule(modIdFor('flock')).asInstance
      const jigIndex2 = exec2.instantiateByClassName(pkgIndex2, 'Flock', []).asJig()
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
