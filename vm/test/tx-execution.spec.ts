import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {TxExecution} from "../vm/tx-execution.js";
import {base16, Pointer, PrivKey, ref, Tx, instructions} from "@aldea/sdk-js";
import {ExecutionError, PermissionError} from "../vm/errors.js";
import {LockType} from "../vm/wasm-instance.js";
import {TxBuilder} from "./tx-builder.js";

const { SignInstruction } = instructions

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
    vm = new VM(storage)

    const sources = [
      'ant',
      'basic-math',
      'coin-eater',
      'flock',
      'forever-counter',
      'nft',
      'sheep',
      'sheep-counter',
      'weapon'
    ]

    sources.forEach(src => {
      const id = vm.addPreCompiled(`aldea/${src}.wasm`, `aldea/${src}.ts`)
      moduleIds.set(src, base16.encode(id))
    })
  })

  let exec: TxExecution
  beforeEach(() => {
    const tx = new Tx()
    exec = new TxExecution(tx, vm)
    exec.markAsFunded()
  })

  it('creates instances from imported modules', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const instanceIndex = exec.instantiateByIndex(importIndex, 'Flock', [0])
    exec.lockJigToUser(instanceIndex, userAddr)
    exec.finalize()

    const output = exec.outputs[0]
    expect(output.packageId).to.eql(modIdFor('flock'))
    expect(output.classIdx).to.eql(0)
  })

  it('sends arguments to constructor properly.', () => {
    const moduleIndex = exec.importModule(modIdFor('weapon')) // index 0
    const weaponIndex = exec.instantiateByIndex(moduleIndex, 'Weapon', ['Sable Corvo de San Martín', 100000]) // index 1
    exec.lockJigToUser(weaponIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql('Sable Corvo de San Martín')
    expect(parsed[1]).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByIndex(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'grow', [])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1) // grow effect
  })

  it('can make calls on jigs sending basic parameters', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByIndex(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'growMany', [7])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(7) // growMany effect
  })

  it('can make calls on jigs sending jigs as parameters', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(flockWasmIndex, 'Flock', [])
    const counterIndex = exec.instantiateByIndex(counterWasmIndex, 'SheepCounter', [])
    const jig = exec.getStatementResult(flockIndex)
    exec.callInstanceMethodByIndex(flockIndex, 'grow', [])
    exec.callInstanceMethodByIndex(counterIndex, 'countFlock', [jig.asJig()])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.lockJigToUser(counterIndex, userAddr)
    exec.finalize()

    const parsed = exec.outputs[1].parsedState()
    expect(parsed[0]).to.eql(1)
    expect(parsed[1]).to.eql(4)
  })

  it('after locking a jig in the code the state gets updated properly', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(flockWasmIndex, 'Flock', [])
    const jig = exec.getStatementResult(flockIndex)
    const shepherdIndex = exec.instantiateByIndex(counterWasmIndex, 'Shepherd', [jig.asJig()])
    exec.lockJigToUser(shepherdIndex, userAddr)
    exec.finalize()

    const flockOutputIndex = 0
    const shepherdOutputIndex = 1
    const parsed = exec.outputs[flockOutputIndex]
    expect(parsed.classIdx).to.eql(0)
    expect(parsed.serializedLock).to.eql({
      type: LockType.CALLER,
      data: new Pointer(exec.tx.hash, shepherdOutputIndex).toBytes()
    })
  })

  it('fails if the tx is trying to lock an already locked jig', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(flockWasmIndex, 'Flock', [])
    const jig = exec.getStatementResult(flockIndex)

    // this locks the flock successfully
    const shepherdIndex = exec.instantiateByIndex(counterWasmIndex, 'Shepherd', [jig.asJig()])
    exec.lockJigToUser(shepherdIndex, userAddr)
    const flockOutputIndex = 0
    // this tries to lock it again
    expect(() => {exec.lockJigToUser(flockIndex, userAddr)}).to.throw(PermissionError,
      `no permission to remove lock from jig ${new Pointer(exec.tx.hash, flockOutputIndex).toString()}`)
  })

  it('fails when a jig tries to lock a locked jig', () => {
    const flockWasmIndex = exec.importModule(modIdFor('flock'))
    const counterWasmIndex = exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(flockWasmIndex, 'Flock', [])
    const jig = exec.getStatementResult(flockIndex)
    // this locks the flock
    exec.lockJigToUser(flockIndex, userAddr)
    // this tries to lock it again
    expect(() => exec.instantiateByIndex(counterWasmIndex, 'Shepherd', [jig.asJig()])).to.throw(PermissionError,
      `lock cannot be changed`)
  })

  it('fails when a jig tries to call a method on a jig of the same class with no permissions', () => {
    const antWasmIndex = exec.importModule(modIdFor('ant'))
    const ant1Index = exec.instantiateByIndex(antWasmIndex, 'Ant', [])
    const ant2Index = exec.instantiateByIndex(antWasmIndex, 'Ant', [])
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
    const ant1Index = exec.instantiateByIndex(antWasmIndex, 'Ant', [])
    const ant2Index = exec.instantiateByIndex(antWasmIndex, 'Ant', [])
    const jig = exec.getStatementResult(ant2Index)
    exec.callInstanceMethodByIndex(ant1Index, 'addFriend', [jig.asJig()]) // does not lock to caller
    exec.lockJigToUser(ant1Index, userAddr)
    exec.lockJigToUser(ant2Index, userAddr)

    expect(() =>
      exec.callInstanceMethodByIndex(ant1Index, 'forceFriendsFamilyToWork', []) // calls private method on not owned jig
    ).to.throw(PermissionError)
  })

  it.skip('does not allow to call private methods on jigs of the same module that own', () => {
    // Private methods works like private methods and fail at compile time
    const antWasmIndex = exec.importModule(modIdFor('ant'))
    const ant1Index = exec.instantiateByIndex(antWasmIndex, 'Ant', [])
    const ant2Index = exec.instantiateByIndex(antWasmIndex, 'Ant', [])
    const jig = exec.getStatementResult(ant2Index)
    exec.callInstanceMethodByIndex(ant1Index, 'addChildren', [jig.asJig()])

    expect(() =>
      exec.callInstanceMethodByIndex(ant1Index, 'buildCapacity', [jig.asJig()])
    ).to.throw(PermissionError)
  })

  describe('when a jig already exists', () => {
    beforeEach(() => {
      const importIndex = exec.importModule(modIdFor('flock'))
      const flockIndex = exec.instantiateByIndex(importIndex, 'Flock', [])
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

      const jigIndex = exec2.loadJigByOrigin(new Pointer(exec.tx.hash, 0))
      exec2.lockJigToUser(jigIndex, otherAddress)
      exec2.markAsFunded()
      exec2.finalize()

      const output = exec2.outputs[0]
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
    let freezeExec: TxExecution
    beforeEach(() => {
      freezeTx = new TxBuilder()
        .sign(PrivKey.fromRandom())
        .build()

      freezeExec = new TxExecution(freezeTx, vm)
      freezeExec.importModule(modIdFor('flock'))
      freezeExec.instantiateByIndex(0, 'Flock', [])
      freezeExec.callInstanceMethodByIndex(1, 'goToFridge', [])
      freezeExec.markAsFunded()
      freezeExec.finalize()
      storage.persist(freezeExec)
    })

    it('cannot be called methods', () => {
      exec.loadJigByOrigin(new Pointer(freezeTx.hash, 0))
      expect(() => exec.callInstanceMethodByIndex(0, 'grow', [])).to
        .throw(PermissionError,
          `jig ${freezeExec.outputs[0].currentLocation.toString()} is not allowed to exec "grow" because it\'s frozen`)
    })

    it('cannot be locked', () => {
      exec.loadJigByOrigin(new Pointer(freezeTx.hash, 0))
      expect(() => exec.lockJigToUser(0, userAddr)).to.throw(PermissionError)
    })

    it('saves correctly serialized lock', () => {
      const state = storage.getJigStateByOrigin(new Pointer(freezeTx.hash, 0), () => expect.fail('should exist'))
      expect(state.serializedLock).to.eql({type: LockType.FROZEN, data: new Uint8Array(0)})
    })
  });

  it('can restore jigs that contain jigs of the same package', () => {
    exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const bagIndex = exec.instantiateByIndex(0, 'FlockBag', [])
    const jig = exec.getStatementResult(flockIndex).asJig()
    exec.callInstanceMethodByIndex(bagIndex, 'addFlock', [jig])
    exec.lockJigToUser(bagIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    storage.persist(exec)

    const tx2 = new TxBuilder()
      .sign(userPriv)
      .build()

    const exec2 = new TxExecution(tx2, vm)
    exec2.loadJigByOutputId(exec.outputs[1].id())
    exec2.callInstanceMethodByIndex(0, 'growAll', [])
    exec2.lockJigToUser(0, userAddr)
    exec2.markAsFunded()
    exec2.finalize()

    const flockOutput = exec2.outputs[0];
    const flockState = flockOutput.parsedState()
    expect(flockState[0]).to.eql(1)
    const bagOutput = exec2.outputs[1];
    const bagState = bagOutput.parsedState()
    expect(bagState[0]).to.eql([flockOutput.origin.toBytes()])
  })

  // Should load from a different package
  it.skip('can restore jigs that contain jigs of the same package', () => {
    exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const bagIndex = exec.instantiateByIndex(0, 'FlockBag', [])
    const jig = exec.getStatementResult(flockIndex).asJig()
    exec.callInstanceMethodByIndex(bagIndex, 'addFlock', [jig])
    exec.lockJigToUser(bagIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    storage.persist(exec)

    const tx2 = new TxBuilder()
      .sign(userPriv)
      .build()

    const exec2 = new TxExecution(tx2, vm)
    exec2.loadJigByOutputId(exec.outputs[1].id())
    exec2.callInstanceMethodByIndex(0, 'growAll', [])
    exec2.lockJigToUser(0, userAddr)
    exec2.markAsFunded()
    exec2.finalize()

    const flockOutput = exec2.outputs[0];
    const flockState = flockOutput.parsedState()
    expect(flockState[0]).to.eql(1)
    const bagOutput = exec2.outputs[1];
    const bagState = bagOutput.parsedState()
    expect(bagState[0]).to.eql([flockOutput.origin.toBytes()])
  })

  it('can send local and external jigs as parameters', () => {
    exec.importModule(modIdFor('flock'))
    exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const flockJig = exec.getStatementResult(flockIndex).asJig()
    const sheperdIndex = exec.instantiateByIndex(1, 'Shepherd', [flockJig])
    const counterIndex = exec.instantiateByIndex(1, 'SheepCounter', [])
    exec.callInstanceMethodByIndex(sheperdIndex, 'growFlockUsingInternalTools', [])
    const shepherdJig = exec.getStatementResult(sheperdIndex).asJig()
    exec.callInstanceMethodByIndex(counterIndex, 'countShepherd', [shepherdJig])
    exec.lockJigToUser(sheperdIndex, userAddr)
    exec.lockJigToUser(counterIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    const flockState = exec.outputs[0].parsedState()
    expect(flockState[0]).to.eql(1)
    const counterState = exec.outputs[2].parsedState()
    expect(counterState[0]).to.eql(1)
    expect(counterState[1]).to.eql(6)
  })

  it('can send static method result as parameter', () => {
    exec.importModule(modIdFor('flock'))
    const flockIndex = exec.execStaticMethodByIndex(0, 'Flock', 'createWithSize', [3])
    const bagIndex = exec.instantiateByIndex(0, 'FlockBag', [])
    const flockJig = exec.getStatementResult(flockIndex).asJig()
    exec.callInstanceMethodByIndex(bagIndex, 'addFlock', [flockJig])
    exec.lockJigToUser(bagIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    const bagState = exec.outputs[1].parsedState()
    expect(bagState[0]).to.eql([exec.outputs[0].origin.toBytes()])
  })

  it('can hidrate jig with extern ref', () => {
    exec.importModule(modIdFor('flock'))
    exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const flockJig = exec.getStatementResult(flockIndex).asJig()
    const sheperdIndex = exec.instantiateByIndex(1, 'Shepherd', [flockJig])
    exec.lockJigToUser(sheperdIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    storage.persist(exec)

    const tx2 = new TxBuilder().sign(userPriv).build()
    const exec2 = new TxExecution(tx2, vm)
    const index = exec2.loadJigByOutputId(exec.outputs[1].id())
    exec2.lockJigToUser(index, userAddr)
    exec2.markAsFunded()
    exec2.finalize()

    expect(exec2.outputs).to.have.length(1) // The internal jig is not loaded because we lazy load.
    const parsedState = exec2.outputs[0].parsedState(); // the first one is the loaded jig
    expect(parsedState).to.have.length(1)
    expect(parsedState[0]).to.eql(exec.outputs[0].origin.toBytes())
  })

  it('does not require re lock for address locked jigs.', () => {
    exec.importModule(modIdFor('flock'))
    exec.importModule(modIdFor('sheep-counter'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    storage.persist(exec)

    const tx2 = new TxBuilder().sign(userPriv).build()
    const exec2 = new TxExecution(tx2, vm)
    const index = exec2.loadJigByOutputId(exec.outputs[0].id())
    exec2.callInstanceMethodByIndex(index, 'grow', [])
    exec2.markAsFunded()
    exec2.finalize()

    expect(exec2.outputs).to.have.length(1)
    expect(exec2.outputs[0].serializedLock.type).to.eql(1)
    expect(exec2.outputs[0].serializedLock.data).to.eql(userAddr.hash)
  })

  it('can send instance method result as parameter', () => {
    exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const bagIndex = exec.instantiateByIndex(0, 'FlockBag', [])
    const callIndex = exec.callInstanceMethodByIndex(flockIndex, 'returnSelf', [])
    const flockJig = exec.getStatementResult(callIndex).asJig()
    exec.callInstanceMethodByIndex(bagIndex, 'addFlock', [flockJig])
    exec.lockJigToUser(bagIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()

    const bagState = exec.outputs[1].parsedState()
    expect(bagState[0]).to.eql([exec.outputs[0].origin.toBytes()])
  })

  it('can send complex nested parameters whith jigs', () => {
    exec.importModule(modIdFor('sheep'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const sheep1Index = exec.instantiateByIndex(0, 'Sheep', ['sheep1', 'black'])
    const sheep2Index = exec.instantiateByIndex(0, 'Sheep', ['sheep2', 'black'])
    exec.callInstanceMethodByIndex(flockIndex, 'addSheepsNested', [ [[ref(sheep1Index)], [ref(sheep2Index)]] ])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.markAsFunded()
    exec.finalize()
  })

  it('can return types with nested jigs', () => {
    exec.importModule(modIdFor('sheep'))
    const flockIndex = exec.instantiateByIndex(0, 'Flock', [])
    const sheep1Index = exec.instantiateByIndex(0, 'Sheep', ['sheep1', 'black'])
    const sheep2Index = exec.instantiateByIndex(0, 'Sheep', ['sheep2', 'white'])
    exec.callInstanceMethodByIndex(flockIndex, 'add', [ref(sheep1Index)])
    exec.callInstanceMethodByIndex(flockIndex, 'add', [ref(sheep2Index)])
    const retIndex = exec.callInstanceMethodByIndex(flockIndex, 'orderedByLegs', [ref(sheep2Index)])
    const ret = exec.getStatementResult(retIndex).value

    expect(Array.from(ret.keys())).to.eql([4])
    expect(Array.from(ret.values())).to.have.length(1)
    expect(Array.from(ret.get(4))).to.have.length(2)
  })

  it('does not add the extra items into the abi', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const instanceIndex = exec.instantiateByIndex(importIndex, 'Flock', [0])
    exec.lockJigToUser(instanceIndex, userAddr)
    exec.finalize()

    storage.persist(exec)

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
    const importIndex = exec.importModule(modIdFor('sheep'))
    const fnResultIdx = exec.execExportedFnByIndex(importIndex, 'buildFlockWithNSheeps', [3])
    exec.lockJigToUser(fnResultIdx, userAddr)
    exec.finalize()

    expect(exec.outputs).to.have.length(4)
  })

  it('can call exported functions from inside jigs', () => {
    const importIndex = exec.importModule(modIdFor('flock'))
    const flockIndex = exec.instantiateByIndex(importIndex, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIndex, 'groWithExternalFunction', [])
    exec.lockJigToUser(flockIndex, userAddr)
    exec.finalize()

    expect(exec.outputs[0].parsedState()[0]).eql(1)
  })

  it('saves entire state for jigs using inheritance', () => {
    const importIndex = exec.importModule(modIdFor('sheep'))
    const sheepIndex = exec.instantiateByIndex(importIndex, 'MutantSheep', ['Wolverine', 'black'])
    exec.lockJigToUser(sheepIndex, userAddr)
    exec.finalize()

    expect(exec.outputs[0].parsedState()).to.have.length(4) // 3 base class + 1 concrete class
  })

  it('can call base class and concrete class methods', () => {
    const importIndex = exec.importModule(modIdFor('sheep'))
    const sheepIndex = exec.instantiateByIndex(importIndex, 'MutantSheep', ['Wolverine', 'black']) // 7 legs
    exec.callInstanceMethodByIndex(sheepIndex, 'chopOneLeg', []) // -1 leg
    exec.callInstanceMethodByIndex(sheepIndex, 'chopOneLeg', []) // -1 leg
    exec.callInstanceMethodByIndex(sheepIndex, 'regenerateLeg', []) // +1 leg
    exec.lockJigToUser(sheepIndex, userAddr)
    exec.finalize()

    const state = exec.outputs[0].parsedState();
    expect(state).to.have.length(4) // 3 base class + 1 concrete class
    expect(state[0]).to.eql('Wolverine') // name
    expect(state[1]).to.eql('black') // color
    expect(state[2]).to.eql(6) // legs. starts wth seven - 1 -1 + 1
    expect(state[3]).to.eql(10) // 3 base class + 1 concrete class
  })

  it('can create, freeze and reload a jig that uses inheritance', () => {
    const importIndex = exec.importModule(modIdFor('sheep'))
    const sheepIndex = exec.instantiateByIndex(importIndex, 'MutantSheep', ['Wolverine', 'black']) // 7 legs
    exec.callInstanceMethodByIndex(sheepIndex, 'chopOneLeg', []) // -1 leg
    exec.lockJigToUser(sheepIndex, userAddr)
    exec.finalize()
    storage.persist(exec)

    const tx2 = new TxBuilder().sign(userPriv).build()
    const exec2 = new TxExecution(tx2, vm)
    const loadIndex = exec2.loadJigByOutputId(exec.outputs[0].id())
    exec2.callInstanceMethodByIndex(loadIndex, 'chopOneLeg', []) // -1 leg
    exec2.callInstanceMethodByIndex(loadIndex, 'regenerateLeg', []) // +1 leg
    exec2.lockJigToUser(loadIndex, userAddr)
    exec2.markAsFunded()
    exec2.finalize()

    const state = exec2.outputs[0].parsedState();
    expect(state).to.have.length(4) // 3 base class + 1 concrete class
    expect(state[0]).to.eql('Wolverine') // 3 base class + 1 concrete class
    expect(state[1]).to.eql('black') // 3 base class + 1 concrete class
    expect(state[2]).to.eql(6) // 3 base class + 1 concrete class
    expect(state[3]).to.eql(10) // 3 base class + 1 concrete class
  })

  it('coin eater', () => {
    const coin = vm.mint(userAddr, 1000)
    const importIndex = exec.importModule(modIdFor('coin-eater'))
    const coinIndex = exec.loadJigByOutputId(coin.id())
    const eaterIndex = exec.instantiateByIndex(importIndex, 'CoinEater', [ref(coinIndex)])
    // exec.callInstanceMethodByIndex(eaterIndex, 'chopOneLeg', [])
    exec.lockJigToUser(eaterIndex, userAddr)
    exec.finalize()
    storage.persist(exec)
  })

  it('keeps locking state up to date after lock', () => {
    exec.tx.push(new SignInstruction(exec.tx.createSignature(userPriv), userPub.toBytes()))
    const importIdx = exec.importModule(modIdFor('flock'))
    const flockIdx = exec.instantiateByIndex(importIdx, 'Flock', [])

    exec.lockJigToUser(flockIdx, userAddr)
    const resIdx = exec.callInstanceMethodByIndex(flockIdx, 'returnLockAddres', [])
    const res = exec.getStatementResult(resIdx).value

    expect(res).to.eql(userAddr.hash)

    exec.lockJigToUser(flockIdx, userAddr)
    exec.finalize()
  })

  it('receives right amount from properties of foreign jigs', () => {
    const flockPkgIdx = exec.importModule(modIdFor('flock'))
    const sheepCountPkgIdx = exec.importModule(modIdFor('sheep-counter'))
    const flockIdx = exec.instantiateByIndex(flockPkgIdx, 'Flock', [])
    exec.callInstanceMethodByIndex(flockIdx, 'grow', [])
    exec.callInstanceMethodByIndex(flockIdx, 'grow', [])
    exec.callInstanceMethodByIndex(flockIdx, 'grow', [])
    const counterIdx = exec.instantiateByIndex(sheepCountPkgIdx, 'Shepherd', [ref(flockIdx)])
    const methodIdx = exec.callInstanceMethodByIndex(counterIdx, 'sheepCount', [])
    const method2Idx = exec.callInstanceMethodByIndex(counterIdx, 'flockIdentifier', [])
    const value = exec.getStatementResult(methodIdx).value
    const value2 = exec.getStatementResult(method2Idx).value
    expect(value).to.eql(3)
    expect(value2).to.eql('numero11')
  })

  it('can create external jigs from inside asc', () => {
    const flockPkgIdx = exec.importModule(modIdFor('flock'))
    const pkgIdx = exec.importModule(modIdFor('sheep-counter'))
    const flockIdx = exec.instantiateByIndex(flockPkgIdx, 'Flock', [])
    const counterIdx = exec.instantiateByIndex(pkgIdx, 'Shepherd', [ref(flockIdx)])
    exec.callInstanceMethodByIndex(counterIdx, 'breedANewFlock', [10])
    exec.lockJigToUser(flockIdx, userAddr)
    exec.lockJigToUser(counterIdx, userAddr)
    exec.markAsFunded()
    exec.finalize()

    expect(exec.outputs).to.have.length(3) // second flock was actually created
    const state = exec.outputs[1].parsedState()
    expect(state[0]).to.eql(new Pointer(exec.tx.id, 2).toBytes()) // flock was actually relplaced
  })

  it('can create jigs inside jigs')
  it('can save numbers inside statement result')
  it('can save strings inside statement result')
  it('can save arrays of jigs inside statement results')
  it('can save arrays of strings inside statement results')
  it('can save arrays of strings inside statement results')

  it('fails if an import is tried to use as a jig')
  it('fails if a number statement result is tried to be use as a jig')
  it('fails if a jig statement result is tried to be used as an import')
  it('can lock to a new address if there is a signature for the previous one')
  it('cannot lock to a new address if there is no signature for the previous one')
})
