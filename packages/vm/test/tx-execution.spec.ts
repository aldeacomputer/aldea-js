import {
  Clock, ExtendedTx,
  Storage,
  VM
} from '../src/index.js'
import {expect} from 'chai'
import {TxExecution} from "../src/tx-execution.js";
import {BCS, Pointer, PrivKey, ref, Tx, instructions } from "@aldea/core";
import { Abi } from '@aldea/core/abi';
import {ExecutionError, PermissionError} from "../src/errors.js";
import {LockType} from "../src/wasm-instance.js";
import {ExecutionResult} from "../src/execution-result.js";
import {emptyTn} from "../src/abi-helpers/well-known-abi-nodes.js";
import {buildVm, emptyExecFactoryFactory} from "./util.js";
import {ExTxExecContext} from "../src/tx-context/ex-tx-exec-context.js";

const {SignInstruction} = instructions

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let abiFor: (key: string) => Abi
  let abiForCoin: () => Abi
  let modIdFor: (key: string) => Uint8Array

  let clock: Clock

  beforeEach(() => {
    const data = buildVm([
      'ant',
      'basic-math',
      'coin-eater',
      'flock',
      'forever-counter',
      'nft',
      'sheep',
      'sheep-counter',
      'weapon',
      'tower'
    ])

    storage = data.storage
    vm = data.vm
    abiFor = (key: string) => storage.getModule(modIdFor(key)).abi
    abiForCoin = () => storage.getModule(Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')).abi
    modIdFor = data.modIdFor
    clock = data.clock
  })

  const emptyExec = emptyExecFactoryFactory(() => storage, () => vm)

  let exec: TxExecution
  beforeEach(() => {
    exec = emptyExec()
  })

  it('returns an executed at prop', () => {
    const mod = exec.importModule(modIdFor('flock'))
    const instanceIndex = exec.instantiateByClassName(mod.asInstance, 'Flock', [0])
    exec.lockJigToUser(instanceIndex.asJig(), userAddr)
    const result = exec.finalize()
    expect(result.executedAt).to.eql(clock.now().unix())
    result.outputs.forEach(o => expect(o.createdAt).to.eql(clock.now().unix()))
  })

  it('creates instances from imported modules', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const instanceIndex = exec.instantiateByClassName(importIndex.asInstance, 'Flock', [0])
    exec.lockJigToUser(instanceIndex.asJig(), userAddr)
    const result = exec.finalize()

    const output = result.outputs[0]
    expect(output.packageId).to.eql(modIdFor('flock'))
    expect(output.classIdx).to.eql(0)
  })

  it('sends arguments to constructor properly.', () => {
    const module = exec.importModule(modIdFor('weapon')) // index 0
    const weapon = exec.instantiateByClassName(module.asInstance, 'Weapon', ['Sable Corvo de San Martín', 100000]) // index 1
    exec.lockJigToUser(weapon.asJig(), userAddr)
    const result = exec.finalize()

    const parsed = result.outputs[0].parsedState(abiFor('weapon'))
    expect(parsed[0]).to.eql('Sable Corvo de San Martín')
    expect(parsed[1]).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByClassName(importIndex.asInstance, 'Flock', [])
    exec.callInstanceMethod(flockIndex.asJig(), 'grow', [])
    exec.lockJigToUser(flockIndex.asJig(), userAddr)
    const result = exec.finalize()

    const parsed = result.outputs[0].parsedState(abiFor('flock'))
    expect(parsed[0]).to.eql(1) // grow effect
  })

  it('can make calls on jigs sending basic parameters', () => {
    const pkg = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.instantiateByClassName(pkg, 'Flock', []).asJig()
    exec.callInstanceMethod(flock, 'growMany', [7])
    exec.lockJigToUser(flock, userAddr)
    const result = exec.finalize()

    const parsed = result.outputs[0].parsedState(abiFor('flock'))
    expect(parsed[0]).to.eql(7) // growMany effect
  })

  it('can make calls on jigs sending jigs as parameters', () => {
    const flockWasm = exec.importModule(modIdFor('flock'))
    const counterWasm = exec.importModule(modIdFor('sheep-counter'))
    const flock = exec.instantiateByClassName(flockWasm.asInstance, 'Flock', [])
    const counterIndex = exec.instantiateByClassName(counterWasm.asInstance, 'SheepCounter', [])
    exec.callInstanceMethod(flock.asJig(), 'grow', [])
    exec.callInstanceMethod(counterIndex.asJig(), 'countFlock', [flock.asJig()])
    exec.lockJigToUser(flock.asJig(), userAddr)
    exec.lockJigToUser(counterIndex.asJig(), userAddr)
    const result = exec.finalize()

    const parsed = result.outputs[1].parsedState(abiFor('sheep-counter'))
    expect(parsed[0]).to.eql(1)
    expect(parsed[1]).to.eql(4)
  })

  it('after locking a jig in the code the state gets updated properly', () => {
    const flockWasm = exec.importModule(modIdFor('flock'))
    const counterWasm = exec.importModule(modIdFor('sheep-counter'))
    const flock = exec.instantiateByClassName(flockWasm.asInstance, 'Flock', [])
    const shepherd = exec.instantiateByClassName(counterWasm.asInstance, 'Shepherd', [flock.asJig()])
    exec.lockJigToUser(shepherd.asJig(), userAddr)
    const result = exec.finalize()

    const flockOutputIndex = 0
    const shepherdOutputIndex = 1
    const parsed = result.outputs[flockOutputIndex]
    expect(parsed.classIdx).to.eql(0)
    expect(parsed.serializedLock).to.eql({
      type: LockType.CALLER,
      data: new Pointer(exec.txContext.tx.hash, shepherdOutputIndex).toBytes()
    })
  })

  it('fails if the tx is trying to lock an already locked jig', () => {
    const flockWasm = exec.importModule(modIdFor('flock'))
    const counterWasm = exec.importModule(modIdFor('sheep-counter'))
    const flock = exec.instantiateByClassName(flockWasm.asInstance, 'Flock', [])

    // this locks the flock successfully
    const shepherdIndex = exec.instantiateByClassName(counterWasm.asInstance, 'Shepherd', [flock.asJig()])
    exec.lockJigToUser(shepherdIndex.asJig(), userAddr)
    const flockOutputIndex = 0
    // this tries to lock it again
    expect(() => {exec.lockJigToUser(flock.asJig(), userAddr)}).to.throw(PermissionError,
      `no permission to remove lock from jig ${new Pointer(exec.txContext.tx.hash, flockOutputIndex).toString()}`)
  })

  it('fails when a jig tries to lock a locked jig', () => {
    const flockWasm = exec.importModule(modIdFor('flock')).asInstance
    const counterWasm = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flock = exec.instantiateByClassName(flockWasm, 'Flock', []).asJig()

    exec.lockJigToUser(flock, userAddr)

    expect(() => exec.instantiateByClassName(counterWasm, 'Shepherd', [flock])).to.throw(PermissionError,
      `lock cannot be changed`)
  })

  it('fails when a jig tries to call a method on a jig of the same class with no permissions', () => {
    const antWasm = exec.importModule(modIdFor('ant')).asInstance
    const ant1 = exec.instantiateByClassName(antWasm, 'Ant', []).asJig()
    const ant2 = exec.instantiateByClassName(antWasm, 'Ant', []).asJig()

    exec.callInstanceMethod(ant1, 'addFriend', [ant2]) // does not lock to caller
    exec.lockJigToUser(ant1, userAddr)
    exec.lockJigToUser(ant2, userAddr)

    expect(() =>
      exec.callInstanceMethod(ant1, 'forceAFriendToWork', []) // calls public method on not owned jig
    ).to.throw(PermissionError)
  })

  it('fails when a jig tries to call a private method on another jig of the same module that does not own', () => {
    const antWasm = exec.importModule(modIdFor('ant')).asInstance
    const ant1 = exec.instantiateByClassName(antWasm, 'Ant', []).asJig()
    const ant2 = exec.instantiateByClassName(antWasm, 'Ant', []).asJig()

    exec.callInstanceMethod(ant1, 'addFriend', [ant2]) // does not lock to caller
    exec.lockJigToUser(ant1, userAddr)
    exec.lockJigToUser(ant2, userAddr)

    expect(() =>
      exec.callInstanceMethod(ant1, 'forceFriendsFamilyToWork', []) // calls private method on not owned jig
    ).to.throw(PermissionError)
  })

  describe('when a jig already exists', () => {
    beforeEach(() => {
      const pkg = exec.importModule(modIdFor('flock')).asInstance
      const flock = exec.instantiateByClassName(pkg, 'Flock', []).asJig()
      exec.lockJigToUser(flock, userAddr)
      const result = exec.finalize()
      storage.persist(result)
    })

    it('can load that jig', () => {
      const otherAddress = PrivKey.fromRandom().toPubKey().toAddress()

      const exec2 = emptyExec([userPriv])

      const jig = exec2.loadJigByOrigin(new Pointer(exec.txContext.tx.hash, 0)).asJig()
      exec2.lockJigToUser(jig, otherAddress)
      exec2.markAsFunded()
      const result = exec2.finalize()

      const output = result.outputs[0]
      expect(output.serializedLock.data).to.eql(otherAddress.hash)
    })
  })

  it('cannot load a jig that does not exists', () => {
    const zeroBuffer = new Uint8Array(32).fill(0);
    const location = new Pointer(zeroBuffer, 99);
    expect(() =>
      exec.loadJigByOrigin(location)
    ).to.throw(ExecutionError, `unknown jig: ${location.toString()}`)
  })

  describe('when a jig was frozen', () => {
    let freezeTx: Tx
    let freezeExecResult: ExecutionResult
    beforeEach(() => {
      const freezeExec = emptyExec([PrivKey.fromRandom()])
      const pkg = freezeExec.importModule(modIdFor('flock')).asInstance
      const jig = freezeExec.instantiateByClassName(pkg, 'Flock', []).asJig()
      freezeExec.callInstanceMethod(jig, 'goToFridge', [])
      freezeExec.markAsFunded()
      freezeExecResult = freezeExec.finalize()
      storage.persist(freezeExecResult)
      freezeTx = freezeExec.txContext.tx
    })

    it('cannot be called methods', () => {
      const jig = exec.loadJigByOrigin(new Pointer(freezeTx.hash, 0)).asJig()
      expect(() => exec.callInstanceMethod(jig, 'grow', [])).to
        .throw(PermissionError,
          `jig ${freezeExecResult.outputs[0].currentLocation.toString()} is not allowed to exec "grow" because it\'s frozen`)
    })

    it('cannot be locked', () => {
      const jig = exec.loadJigByOrigin(new Pointer(freezeTx.hash, 0)).asJig()
      expect(() => exec.lockJigToUser(jig, userAddr)).to.throw(PermissionError)
    })

    it('saves correctly serialized lock', () => {
      const state = storage.getJigStateByOrigin(new Pointer(freezeTx.hash, 0)).orElse(() => expect.fail('should exist'))
      expect(state.serializedLock).to.eql({type: LockType.FROZEN, data: new Uint8Array(0)})
    })
  });

  it('can restore jigs that contain jigs of the same package', () => {
    const wasm = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.instantiateByClassName(wasm, 'Flock', []).asJig()
    const bag = exec.instantiateByClassName(wasm, 'FlockBag', []).asJig()

    exec.callInstanceMethod(bag, 'addFlock', [flock])
    exec.lockJigToUser(bag, userAddr)
    exec.markAsFunded()
    const result1 = exec.finalize()

    storage.persist(result1)

    const exec2 = emptyExec([userPriv])
    const loadedBag = exec2.loadJigByOutputId(result1.outputs[1].id()).asJig()
    exec2.callInstanceMethod(loadedBag, 'growAll', [])
    exec2.lockJigToUser(loadedBag, userAddr)
    exec2.markAsFunded()
    const result2 = exec2.finalize()

    const flockOutput = result2.outputs[1];
    const flockState = flockOutput.parsedState(abiFor('flock'))
    expect(flockState[0]).to.eql(1)
    const bagOutput = result2.outputs[0];
    const bagState = bagOutput.parsedState(abiFor('flock'))
    expect(bagState[0]).to.eql([flockOutput.origin])
  })


  it('can send local and external jigs as parameters', () => {
    const flockWasm = exec.importModule(modIdFor('flock')).asInstance
    const counterWasm = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flockStmt = exec.instantiateByClassName(flockWasm, 'Flock', [])

    const shepherd = exec.instantiateByClassName(counterWasm, 'Shepherd', [flockStmt.asJig()]).asJig()
    const counter = exec.instantiateByClassName(counterWasm, 'SheepCounter', []).asJig()
    exec.callInstanceMethod(shepherd, 'growFlockUsingInternalTools', [])

    exec.callInstanceMethod(counter, 'countShepherd', [shepherd])
    exec.lockJigToUser(shepherd, userAddr)
    exec.lockJigToUser(counter, userAddr)
    exec.markAsFunded()
    const result = exec.finalize()

    const flockState = result.outputs[0].parsedState(abiFor('flock'))
    expect(flockState[0]).to.eql(1)
    const counterState = result.outputs[2].parsedState(abiFor('sheep-counter'))
    expect(counterState[0]).to.eql(1)
    expect(counterState[1]).to.eql(6)
  })

  it('can send static method result as parameter', () => {
    const flockWasm = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.execStaticMethod(flockWasm, 'Flock', 'createWithSize', [3]).asJig()
    const bag = exec.instantiateByClassName(flockWasm, 'FlockBag', []).asJig()

    exec.callInstanceMethod(bag, 'addFlock', [flock])
    exec.lockJigToUser(bag, userAddr)
    exec.markAsFunded()
    const result = exec.finalize()

    const bagState = result.outputs[1].parsedState(abiFor('flock'))
    expect(bagState[0]).to.eql([result.outputs[0].origin])
  })

  it('can hidrate jig with extern ref', () => {
    const flockWasm = exec.importModule(modIdFor('flock')).asInstance
    const counterWasm = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flock = exec.instantiateByClassName(flockWasm, 'Flock', []).asJig()
    const sheperd = exec.instantiateByClassName(counterWasm, 'Shepherd', [flock]).asJig()
    exec.lockJigToUser(sheperd, userAddr)
    exec.markAsFunded()
    const ret1 = exec.finalize()

    storage.persist(ret1)

    const exec2 = emptyExec([userPriv])
    const loadedJig = exec2.loadJigByOutputId(ret1.outputs[1].id()).asJig()
    exec2.lockJigToUser(loadedJig, userAddr)
    exec2.markAsFunded()
    const ret2 = exec2.finalize()

    expect(ret2.outputs).to.have.length(1) // The internal jig is not loaded because we lazy load.
    const parsedState = ret2.outputs[0].parsedState(abiFor('sheep-counter')); // the first one is the loaded jig
    expect(parsedState).to.have.length(1)
    expect(parsedState[0]).to.eql(ret1.outputs[0].origin)
  })

  it('does not require re lock for address locked jigs.', () => {
    const flockWasm = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.instantiateByClassName(flockWasm, 'Flock', []).asJig()
    exec.lockJigToUser(flock, userAddr)
    exec.markAsFunded()
    const ret1 = exec.finalize()

    storage.persist(ret1)

    const exec2 = emptyExec([userPriv])
    const loadedJig = exec2.loadJigByOutputId(ret1.outputs[0].id()).asJig()
    exec2.callInstanceMethod(loadedJig, 'grow', [])
    exec2.markAsFunded()
    const ret2 = exec2.finalize()

    expect(ret2.outputs).to.have.length(1)
    expect(ret2.outputs[0].serializedLock.type).to.eql(1)
    expect(ret2.outputs[0].serializedLock.data).to.eql(userAddr.hash)
  })

  it('can send instance method result as parameter', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
    const bag = exec.instantiateByClassName(flockPkg, 'FlockBag', []).asJig()
    const callResult = exec.callInstanceMethod(flock, 'returnSelf', []).asJig()
    // const flockJig = exec.getStatementResult(callResult).asJig()
    exec.callInstanceMethod(bag, 'addFlock', [callResult])
    exec.lockJigToUser(bag, userAddr)
    exec.markAsFunded()
    const ret = exec.finalize()

    const bagState = ret.outputs[1].parsedState(abiFor('flock'))
    expect(bagState[0]).to.eql([ret.outputs[0].origin])
  })

  it('can send complex nested parameters with jigs', () => {
    const sheepWasmn = exec.importModule(modIdFor('sheep')).asInstance
    const flock = exec.instantiateByClassName(sheepWasmn, 'Flock', []).asJig()
    const sheep1 = exec.instantiateByClassName(sheepWasmn, 'Sheep', ['sheep1', 'black'])
    const sheep2 = exec.instantiateByClassName(sheepWasmn, 'Sheep', ['sheep2', 'black'])
    exec.callInstanceMethod(flock, 'addSheepsNested', [[[ref(sheep1.idx)], [ref(sheep2.idx)]]])
    exec.lockJigToUser(flock, userAddr)
    exec.markAsFunded()
    exec.finalize()
  })

  it('can return types with nested jigs', () => {
    const sheepPkg = exec.importModule(modIdFor('sheep')).asInstance
    const flock = exec.instantiateByClassName(sheepPkg, 'Flock', [])
    const sheep1 = exec.instantiateByClassName(sheepPkg, 'Sheep', ['sheep1', 'black'])
    const sheep2 = exec.instantiateByClassName(sheepPkg, 'Sheep', ['sheep2', 'white'])
    exec.callInstanceMethod(flock.asJig(), 'add', [ref(sheep1.idx)])
    exec.callInstanceMethod(flock.asJig(), 'add', [ref(sheep2.idx)])
    const retIndex = exec.callInstanceMethod(flock.asJig(), 'orderedByLegs', [ref(sheep2.idx)]).idx
    const ret = exec.getStatementResult(retIndex).value

    expect(Array.from(ret.keys())).to.eql([4])
    expect(Array.from(ret.values())).to.have.length(1)
    expect(Array.from(ret.get(4))).to.have.length(2)
  })

  it('does not add the extra items into the abi', () => {
    const importIndex = exec.importModule(modIdFor('flock')).asInstance
    const instanceIndex = exec.instantiateByClassName(importIndex, 'Flock', [0]).asJig()
    exec.lockJigToUser(instanceIndex, userAddr)
    const ret = exec.finalize()

    storage.persist(ret)

    const mod = storage.getModule(modIdFor('flock'))

    const utxoNode = mod.abi.exports.find(e => e.code.name === 'UtxoState')
    const lockNode = mod.abi.exports.find(e => e.code.name === 'LockState')
    const coinNode = mod.abi.imports.find(e => e.name === 'Coin')
    const jigNode = mod.abi.imports.find(e => e.name === 'Jig')
    expect(utxoNode).to.eql(undefined)
    expect(coinNode).to.eql(undefined)
    expect(jigNode).to.eql(undefined)
    expect(lockNode).to.eql(undefined)
  })

  it('can call top level functions', () => {
    const imported = exec.importModule(modIdFor('sheep')).asInstance
    const fnResult = exec.execExportedFnByName(imported, 'buildFlockWithNSheeps', [3])
    exec.lockJigToUser(fnResult.asJig(), userAddr)
    const ret = exec.finalize()

    expect(ret.outputs).to.have.length(4)
  })

  it('can call exported functions from inside jigs', () => {
    const flockWasm = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.instantiateByClassName(flockWasm, 'Flock', []).asJig()
    exec.callInstanceMethod(flock, 'groWithExternalFunction', [])
    exec.lockJigToUser(flock, userAddr)
    const ret = exec.finalize()

    expect(ret.outputs[0].parsedState(abiFor('flock'))[0]).eql(1)
  })

  it('saves entire state for jigs using inheritance', () => {
    const wasm = exec.importModule(modIdFor('sheep')).asInstance
    const sheep = exec.instantiateByClassName(wasm, 'MutantSheep', ['Wolverine', 'black'])
    exec.lockJigToUser(sheep.asJig(), userAddr)
    const ret = exec.finalize()

    expect(ret.outputs[0].parsedState(abiFor('sheep'))).to.have.length(4) // 3 base class + 1 concrete class
  })

  it('can call base class and concrete class methods', () => {
    const wasm = exec.importModule(modIdFor('sheep')).asInstance
    const sheep = exec.instantiateByClassName(wasm, 'MutantSheep', ['Wolverine', 'black']).asJig() // 7 legs
    exec.callInstanceMethod(sheep, 'chopOneLeg', []) // -1 leg
    exec.callInstanceMethod(sheep, 'chopOneLeg', []) // -1 leg
    exec.callInstanceMethod(sheep, 'regenerateLeg', []) // +1 leg
    exec.lockJigToUser(sheep, userAddr)
    const ret = exec.finalize()

    const state = ret.outputs[0].parsedState(abiFor('sheep'));
    expect(state).to.have.length(4) // 3 base class + 1 concrete class
    expect(state[0]).to.eql('Wolverine') // name
    expect(state[1]).to.eql('black') // color
    expect(state[2]).to.eql(6) // legs. starts wth seven - 1 -1 + 1
    expect(state[3]).to.eql(10) // 3 base class + 1 concrete class
  })

  it('can create, freeze and reload a jig that uses inheritance', () => {
    const wasm = exec.importModule(modIdFor('sheep')).asInstance
    const sheep = exec.instantiateByClassName(wasm, 'MutantSheep', ['Wolverine', 'black']).asJig() // 7 legs
    exec.callInstanceMethod(sheep, 'chopOneLeg', []) // -1 leg
    exec.lockJigToUser(sheep, userAddr)
    const ret1 = exec.finalize()
    storage.persist(ret1)

    const exec2 = emptyExec([userPriv])
    const loaded = exec2.loadJigByOutputId(ret1.outputs[0].id()).asJig()
    exec2.callInstanceMethod(loaded, 'chopOneLeg', []) // -1 leg
    exec2.callInstanceMethod(loaded, 'regenerateLeg', []) // +1 leg
    exec2.lockJigToUser(loaded, userAddr)
    exec2.markAsFunded()
    const ret2 = exec2.finalize()

    const state = ret2.outputs[0].parsedState(abiFor('sheep'));
    expect(state).to.have.length(4) // 3 base class + 1 concrete class
    expect(state[0]).to.eql('Wolverine') // 3 base class + 1 concrete class
    expect(state[1]).to.eql('black') // 3 base class + 1 concrete class
    expect(state[2]).to.eql(6) // 3 base class + 1 concrete class
    expect(state[3]).to.eql(10) // 3 base class + 1 concrete class
  })

  it('coin eater', () => {
    const exec = emptyExec([userPriv])
    const mintedCoin = vm.mint(userAddr, 1000)
    const wasm = exec.importModule(modIdFor('coin-eater')).asInstance
    const coin = exec.loadJigByOutputId(mintedCoin.id()).asJig()
    const eaterIndex = exec.instantiateByClassName(wasm, 'CoinEater', [coin]).asJig()
    exec.lockJigToUser(eaterIndex, userAddr)
    const ret = exec.finalize()
    storage.persist(ret)

    const eaterState = ret.outputs[0].parsedState(abiFor('coin-eater'))
    expect(eaterState[0]).to.eql(ret.outputs[1].origin)
    expect(eaterState[1]).to.eql([])
  })

  it('keeps locking state up to date after lock', () => {
    const exec = emptyExec([userPriv])
    const wasm = exec.importModule(modIdFor('flock')).asInstance
    const flock = exec.instantiateByClassName(wasm, 'Flock', []).asJig()

    exec.lockJigToUser(flock, userAddr)
    const resIdx = exec.callInstanceMethod(flock, 'returnLockAddres', []).idx
    const res = exec.getStatementResult(resIdx).value

    expect(res).to.eql(userAddr.hash)

    exec.lockJigToUser(flock, userAddr)
    exec.finalize()
  })

  it('receives right amount from properties of foreign jigs', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const sheepCountPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flock = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
    exec.callInstanceMethod(flock, 'grow', [])
    exec.callInstanceMethod(flock, 'grow', [])
    exec.callInstanceMethod(flock, 'grow', [])
    const counter = exec.instantiateByClassName(sheepCountPkg, 'Shepherd', [flock]).asJig()
    const methodStmt = exec.callInstanceMethod(counter, 'sheepCount', [])
    const method2Stmt = exec.callInstanceMethod(counter, 'flockIdentifier', [])
    const value = exec.getStatementResult(methodStmt.idx).value
    const value2 = exec.getStatementResult(method2Stmt.idx).value
    expect(value).to.eql(3)
    expect(value2).to.eql(`Flock with size: 3`)
  })

  it('can create external jigs from inside asc', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flockStmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
    const counterStmt = exec.instantiateByClassName(counterPkg, 'Shepherd', [ref(flockStmt.idx)])
    exec.callInstanceMethod(counterStmt.asJig(), 'breedANewFlock', [10])
    exec.lockJigToUser(flockStmt.asJig(), userAddr)
    exec.lockJigToUser(counterStmt.asJig(), userAddr)
    exec.markAsFunded()
    const ret = exec.finalize()

    expect(ret.outputs).to.have.length(3) // second flock was actually created
    const state = ret.outputs[1].parsedState(abiFor('sheep-counter'))
    expect(state[0]).to.eql(new Pointer(exec.txContext.tx.id, 2)) // flock was actually relplaced
  })

  it('can combine coins owned by a jig inside that jig', () => {
    const coin1 = vm.mint(userAddr, 300)
    const coin2 = vm.mint(userAddr, 400)
    const coin3 = vm.mint(userAddr, 500)
    const exec = emptyExec([userPriv])

    const coinEaterPkg = exec.importModule(modIdFor('coin-eater')).asInstance
    const coin1Jig = exec.loadJigByOutputId(coin1.id()).asJig()
    const coin2Jig = exec.loadJigByOutputId(coin2.id()).asJig()
    const coin3Jig = exec.loadJigByOutputId(coin3.id()).asJig()
    const eaterJig = exec.instantiateByClassName(coinEaterPkg, 'CoinEater', [coin1Jig]).asJig()
    exec.callInstanceMethod(eaterJig, 'addCoin', [coin2Jig])
    exec.callInstanceMethod(eaterJig, 'addCoin', [coin3Jig])
    exec.callInstanceMethod(eaterJig, 'combineAll', [])
    exec.lockJigToUser(eaterJig, userAddr)

    exec.markAsFunded()
    const ret = exec.finalize()

    expect(ret.outputs).to.have.length(4)
    expect(ret.outputs[1].serializedLock.type).to.eql(-1)
    expect(ret.outputs[2].serializedLock.type).to.eql(-1)
    expect(ret.outputs[3].serializedLock.type).to.eql(2)
    expect(ret.outputs[3].serializedLock.data).to.eql(ret.outputs[0].origin.toBytes())

    expect(ret.outputs[3].parsedState(abiForCoin())).to.eql([300n + 400n + 500n])
    expect(ret.outputs[0].parsedState(abiFor('coin-eater'))).to.eql([ret.outputs[3].origin, []])
  })

  it('can save numbers inside statement result', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flockJig = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
    exec.callInstanceMethod(flockJig, 'grow', []) // size = 1
    exec.callInstanceMethod(flockJig, 'grow', []) // size = 2
    const shepherd = exec.instantiateByClassName(counterPkg, 'Shepherd', [flockJig]).asJig()
    const methodIdx = exec.callInstanceMethod(shepherd, 'sheepCount', [flockJig]).idx

    const statement = exec.getStatementResult(methodIdx);
    expect(statement.value).to.eql(2)
    expect(statement.abiNode).to.eql(emptyTn('u32'))
  })

  it('can save strings inside statement result', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flockIdx = exec.instantiateByClassName(flockPkg, 'Flock', [])
    const shepherdIdx = exec.instantiateByClassName(counterPkg, 'Shepherd', [ref(flockIdx.idx)])
    const methodIdx = exec.callInstanceMethod(shepherdIdx.asJig(), 'flockIdentifier', [ref(flockIdx.idx)])

    const statement = exec.getStatementResult(methodIdx.idx)
    expect(statement.value).to.eql(`Flock with size: 0`)
    expect(statement.abiNode).to.eql(emptyTn('string'))
  })

  it('can save arrays of jigs inside statement results', () => {
    const antPkg = exec.importModule(modIdFor('ant')).asInstance
    const ant1Stmt = exec.instantiateByClassName(antPkg, 'Ant', [])
    const ant2Stmt = exec.instantiateByClassName(antPkg, 'Ant', [])
    exec.callInstanceMethod(ant1Stmt.asJig(), 'addChildren', [ref(ant2Stmt.idx)])
    const methodStmt = exec.callInstanceMethod(ant1Stmt.asJig(), 'getFamily', [ref(ant2Stmt.idx)])

    const statement = exec.getStatementResult(methodStmt.idx)
    expect(statement.value).to.have.length(1)
    expect(statement.value[0].origin).to.eql(new Pointer(exec.txContext.tx.id, 1))
  })

  it('fails if an import is tried to use as a jig in the target', () => {
    const flockPkg = exec.importModule(modIdFor('flock'))

    expect(
      () => exec.callInstanceMethodByIndex(flockPkg.idx, 0, new Uint8Array([]))
    ).to.throw(ExecutionError)
  })

  it('fails if an import is tried to use as a jig in the arguments', () => {
    const flockPkg = exec.importModule(modIdFor('flock'))
    const counterPkgStmt = exec.importModule(modIdFor('sheep-counter'))

    expect(
      () => exec.instantiateByIndex(
        counterPkgStmt.idx,
        counterPkgStmt.asInstance.abi.classIdxByName('Shepherd'),
        new BCS(counterPkgStmt.asInstance.abi.abi).encode('Shepherd_constructor', [ref(flockPkg.idx)])
      )
    ).to.throw(ExecutionError)
  })

  it('fails if a number statement result is tried to be use as a jig', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
    const flock1Stmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
    const flock2Stmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
    exec.callInstanceMethod(flock2Stmt.asJig(), 'grow', []) // size = 1
    exec.callInstanceMethod(flock2Stmt.asJig(), 'grow', []) // size = 2
    const shepherdStmt = exec.instantiateByClassName(counterPkg, 'Shepherd', [ref(flock1Stmt.idx)])
    const methodStmt = exec.callInstanceMethod(shepherdStmt.asJig(), 'sheepCount', [])

    expect(
      () => exec.callInstanceMethodByIndex(
        methodStmt.idx,
        1,
        new BCS(abiFor('sheep-counter')).encode('Shepherd$replace', [ref(0)])
      )
    ).to.throw(ExecutionError)
  })

  it('fails if a jig statement result is tried to be used as an import', () => {
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const flockStmt = exec.instantiateByClassName(flockPkg, 'Flock', [])

    expect(
      () => exec.instantiateByIndex(flockStmt.idx, 1, new Uint8Array([]))
    ).to.throw(ExecutionError)
  })

  it('can lock to a new address if there is a signature for the previous one', () => {
    const privKey1 = PrivKey.fromRandom()
    const addr1 = privKey1.toPubKey().toAddress()
    const privKey2 = PrivKey.fromRandom()
    const addr2 = privKey2.toPubKey().toAddress()


    exec = emptyExec([privKey1])
    exec.markAsFunded()
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const flockJig = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
    // works, jig was unlocked
    exec.lockJigToUser(flockJig, addr1)
    // works, jig was locked to addr1, and tx was signed by privKey1
    exec.lockJigToUser(flockJig, addr2)
    const ret = exec.finalize()

    const lock = ret.outputs[0].lockObject()
    expect(lock.data).to.eql(addr2.hash)
  })

  // it('tower magic', () => {
  //   const importStmt = exec.importModule(modIdFor('tower'))
  //   const towerJigStmt = exec.instantiateByClassName(importStmt.asInstance, 'Tower', [])
  //   exec.lockJigToUser(towerJigStmt.asJig(), userAddr)
  //   const result = exec.finalize()
  //
  //   expect(result.outputs).to.have.length(1)
  //
  // })
  //
  // it('tower pkg_id', () => {
  //   const map = new Map<string, string>();
  //   const value1 = fs.readFileSync('./assembly/aldea/tower.ts');
  //   map.set('tower.ts', value1.toString())
  //   let pkgId = calculatePackageId(['tower.ts'], map)
  //   console.log(base16.encode(pkgId))
  // })


  it('can lock to a new address fails if there is no signature for the previous one', () => {
    const privKey1 = PrivKey.fromRandom()
    const addr1 = privKey1.toPubKey().toAddress()
    const privKey2 = PrivKey.fromRandom()
    const addr2 = privKey2.toPubKey().toAddress()


    // tx has no signature for privKey1
    exec = emptyExec()
    exec.markAsFunded()
    const flockPkg = exec.importModule(modIdFor('flock')).asInstance
    const flockJig = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
    // works, jig was unlocked
    exec.lockJigToUser(flockJig, addr1)

    expect(
      () => exec.lockJigToUser(flockJig, addr2)
    ).to.throw(PermissionError)
  })

  it('a tx can be funded in parts', () => {
    const tx = new Tx()
    tx.push(new SignInstruction(tx.createSignature(userPriv), userPub.toBytes()))
    const coin = vm.mint(userAddr, 1000)
    exec = new TxExecution(
      new ExTxExecContext(
        new ExtendedTx(tx, [coin.toOutput()]),
        clock,
        storage,
        vm
      )
    )

    const loaded = exec.loadJigByOutputId(coin.id())
    const coin1 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin2 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin3 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin4 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin5 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])

    exec.fundByIndex(coin1.idx)
    exec.fundByIndex(coin2.idx)
    exec.fundByIndex(coin3.idx)
    exec.fundByIndex(coin4.idx)
    exec.fundByIndex(coin5.idx) // adds up 100

    const result = exec.finalize()

    expect(result.outputs[0].parsedState(abiForCoin())[0]).to.eql(900n)
    expect(result.outputs[1].lockType()).to.eql(LockType.FROZEN)
    expect(result.outputs[2].lockType()).to.eql(LockType.FROZEN)
    expect(result.outputs[3].lockType()).to.eql(LockType.FROZEN)
    expect(result.outputs[4].lockType()).to.eql(LockType.FROZEN)
    expect(result.outputs[5].lockType()).to.eql(LockType.FROZEN)
  })

  it('fails is not eunogh parts', () => {
    const tx = new Tx()
    tx.push(new SignInstruction(tx.createSignature(userPriv), userPub.toBytes()))
    const coin = vm.mint(userAddr, 1000)
    exec = new TxExecution(
      new ExTxExecContext(
        new ExtendedTx(tx, [coin.toOutput()]),
        clock,
        storage,
        vm
      )
    )

    const loaded = exec.loadJigByOutputId(coin.id())
    const coin1 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin2 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin3 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin4 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
    const coin5 = exec.callInstanceMethod(loaded.asJig(), 'send', [19])

    exec.fundByIndex(coin1.idx)
    exec.fundByIndex(coin2.idx)
    exec.fundByIndex(coin3.idx)
    exec.fundByIndex(coin4.idx)
    exec.fundByIndex(coin5.idx) // adds up 99

    expect(() => exec.finalize()).to.throw(ExecutionError, 'Not enough funding. Provided: 99. Needed: 100')
  })
})
