import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {Location, PrivKey, Tx, TxBuilder} from "@aldea/sdk-js";
import {ExecutionError, PermissionError} from "../vm/errors.js";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

  function modIdFor (key: string): string {
    const id = moduleIds.get(key)
    if (!id) {
      throw new Error(`module was not deployed: ${key}`)
    }
    return id
  }

  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)

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
      moduleIds.set(src, id)
    })
  })

  let exec: TxExecution
  beforeEach(() => {
    const tx = new Tx()
    exec = new TxExecution(tx, vm)
  })

  it('creates instances from imported modules', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const instanceIndex = exec.instantiate(importIndex, 'Flock', [0])
    exec.lockJigToUser(instanceIndex, userAddr)
    exec.finalize()

    const output = exec.outputs[0]
    expect(output.moduleId).to.eql(modIdFor('flock'))
    expect(output.className).to.eql('Flock')
  })

  it('sends arguments to constructor properly.', () => {
    const moduleIndex = exec.importModule(modIdFor('weapon')) // index 0
    const weaponIndex = exec.instantiate(moduleIndex, 'Weapon', ['Sable Corvo de San Martín', 100000]) // index 1
    exec.lockJigToUser(weaponIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].objectState(exec.getImportedModule(moduleIndex))
    expect(parsed.name).to.eql('Sable Corvo de San Martín')
    expect(parsed.power).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiate(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'grow', [])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1) // grow effect
  })

  it('can make calls on jigs sending basic parameters', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiate(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'growMany', [7])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(7) // growMany effect
  })

  it('can make calls on jigs sending jigs as parameters', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiate(flockWasmIndex, 'Flock', [])
    const counterIndex = exec.instantiate(counterWasmIndex, 'SheepCounter', [])
    const jig = exec.getStatementResult(flockIndex)
    exec.callInstanceMethodByIndex(flockIndex, 'grow', [])
    exec.callInstanceMethodByIndex(counterIndex, 'countFlock', [jig.asJig()])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.lockJigToUser(counterIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[1].objectState(exec.getImportedModule(counterWasmIndex))
    expect(parsed.sheepCount).to.eql(1)
    expect(parsed.legCount).to.eql(4)
  })

  it('after locking a jig in the code the state gets updated properly', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiate(flockWasmIndex, 'Flock', [])
    const jig = exec.getStatementResult(flockIndex)
    const shepherdIndex = exec.instantiate(counterWasmIndex, 'Shepherd', [jig.asJig()])
    exec.lockJigToUser(shepherdIndex, userAddr)
    exec.finalize()

    const flockOutputIndex = 0
    const shepherdOutputIndex = 1
    const parsed = exec.outputs[flockOutputIndex]
    expect(parsed.className).to.eql('Flock')
    expect(parsed.serializedLock).to.eql( {type: 'JigLock',   data: {
        "origin": new Location(exec.tx.hash, shepherdOutputIndex).toString()
      }})
  })

  it('fails if the tx is trying to lock an already locked jig', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiate(flockWasmIndex, 'Flock', [])
    const jig = exec.getStatementResult(flockIndex)

    // this locks the flock successfully
    const shepherdIndex = exec.instantiate(counterWasmIndex, 'Shepherd', [jig.asJig()])
    exec.lockJigToUser(shepherdIndex, userAddr)
    const flockOutputIndex = 0
    // this tries to lock it again
    expect(() => {exec.lockJigToUser(flockIndex, userAddr)}).to.throw(PermissionError,
      `no permission to remove lock from jig ${new Location(exec.tx.hash, flockOutputIndex).toString()}`)
  })

  it('fails when a jig tries to lock a locked jig', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiate(flockWasmIndex, 'Flock', [])
    const jig = exec.getStatementResult(flockIndex)
    // this locks the flock
    exec.lockJigToUser(flockIndex, userAddr)
    // this tries to lock it again
    expect(() => exec.instantiate(counterWasmIndex, 'Shepherd', [jig.asJig()])).to.throw(PermissionError,
      `lock cannot be changed`)
  })

  it('fails when a jig tries to call a method on a jig of the same class with no permissions', () => {
    const antWasmIndex = exec.importModule(modIdFor('ant'))
    const ant1Index = exec.instantiate(antWasmIndex, 'Ant', [])
    const ant2Index = exec.instantiate(antWasmIndex, 'Ant', [])
    const jig = exec.getStatementResult(ant2Index)
    exec.callInstanceMethodByIndex(ant1Index, 'addFriend', [jig.asJig()]) // does not lock to caller
    exec.lockJigToUser(ant1Index, userAddr)
    exec.lockJigToUser(ant2Index, userAddr)

    expect(() =>
      exec.callInstanceMethodByIndex(ant1Index, 'forceAFriendToWork', []) // calls public method on not owned jig
    ).to.throw(PermissionError)
  })

  it('fails when a jig tries to call a private method on another jig of the same module that does not own', () => {
    const antWasmIndex = exec.importModule(modIdFor('ant'))
    const ant1Index = exec.instantiate(antWasmIndex, 'Ant', [])
    const ant2Index = exec.instantiate(antWasmIndex, 'Ant', [])
    const jig = exec.getStatementResult(ant2Index)
    exec.callInstanceMethodByIndex(ant1Index, 'addFriend', [jig.asJig()]) // does not lock to caller
    exec.lockJigToUser(ant1Index, userAddr)
    exec.lockJigToUser(ant2Index, userAddr)

    expect(() =>
      exec.callInstanceMethodByIndex(ant1Index, 'forceFriendsFamilyToWork', []) // calls private method on not owned jig
    ).to.throw(PermissionError)
  })

  it('allow to call private methods on jigs of the same module that own', () => {
    const antWasmIndex = exec.importModule(modIdFor('ant'))
    const ant1Index = exec.instantiate(antWasmIndex, 'Ant', [])
    const ant2Index = exec.instantiate(antWasmIndex, 'Ant', [])
    const jig = exec.getStatementResult(ant2Index)
    exec.callInstanceMethodByIndex(ant1Index, 'addChildren', [jig.asJig()])
    exec.callInstanceMethodByIndex(ant1Index, 'buildCapacity', [jig.asJig()])
    exec.lockJigToUser(ant1Index, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.have.length(1)
    expect(parsed[1]).to.eql([])
  })

  describe('when a jig already exists', () => {
    beforeEach(() => {
      const importIndex = exec.importModule(modIdFor('flock'))
      const flockIndex = exec.instantiate(importIndex, 'Flock', [])
      exec.lockJigToUser(flockIndex, userAddr)
      exec.finalize()
      storage.persist(exec)
    })

    it('can load that jig', () => {
      const otherAddress = PrivKey.fromRandom().toPubKey().toAddress()
      const tx2 = new TxBuilder()
        .sign(userPriv)
        .build()

      const exec2 = new TxExecution(tx2, vm)

      const jigIndex = exec2.loadJig(new Location(exec.tx.hash, 0), false, false)
      exec2.lockJigToUser(jigIndex, otherAddress)
      exec2.finalize()

      const output = exec2.outputs[0]
      expect(output.serializedLock.data.pubkey).to.eql(otherAddress)
    })
  })

  it('cannot load a jig that does not exists', () => {
    const locationString = new Array(64).fill('0').join('')
    expect(() =>
      exec.loadJig(new Location(Buffer.alloc(32).fill(0).buffer, 99), false, false)
    ).to.throw(ExecutionError, `unknown jig: ${locationString}_o99`)
  })

  describe('when a jig was frozen', () => {
    let freezeTx: Tx
    let freezeExec: TxExecution
    beforeEach(() => {
      freezeTx = new TxBuilder()
        .sign(PrivKey.fromRandom())
        .build()

      freezeExec = new TxExecution(freezeTx, vm)
      freezeExec.importModule(modIdFor('flock'))
      freezeExec.instantiate(0, 'Flock', [])
      freezeExec.callInstanceMethodByIndex(1, 'goToFridge', [])
      freezeExec.finalize()
      storage.persist(freezeExec)
    })

    it('cannot be called methods', () => {
      exec.loadJig(new Location(freezeTx.hash, 0), false, false)
      expect(() => exec.callInstanceMethodByIndex(0, 'grow', [])).to.throw(PermissionError)
    })

    it('cannot be locked', () => {
      exec.loadJig(new Location(freezeTx.hash, 0), false, false)
      expect(() => exec.lockJigToUser(0, userAddr)).to.throw(PermissionError)
    })

    it('saves correctly serialized lock', () => {
      const state = storage.getJigState(new Location(freezeTx.hash, 0), () => expect.fail('should exist'))
      expect(state.serializedLock).to.eql({type: 'FrozenLock'})
    })
  });

  it('can call top level functions')
  it('can create jigs inside jigs')
  it('can save numbers inside statement result')
  it('can save strings inside statement result')
  it('can save arrays of jigs inside statement results')
  it('can save arrays of strings inside statement results')
  it('can save arrays of strings inside statement results')

  it('fails if an import is tried to use as a jig')
  it('fails if a number statement result is tried to be use as a jig')
  it('fails if a jig statement result is tried to be used as an import')
})
