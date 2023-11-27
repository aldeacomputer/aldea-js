import {Storage, VM} from '../src/index.js'
import {expect} from 'chai'
import {base16, BCS, BufReader, LockType, Output, Pointer, PrivKey, PubKey, ref} from "@aldea/core";
import {Abi} from '@aldea/core/abi';
import {ArgsBuilder, buildVm, emptyExecFactoryFactory, parseOutput} from "./util.js";
import {COIN_CLS_PTR} from "../src/memory/well-known-abi-nodes.js";
import {ExecutionError, PermissionError} from "../src/errors.js";
import {TxExecution} from "../src/tx-execution.js";
import {StatementResult} from "../src/statement-result.js";
import {ExecutionResult} from "../src/index.js";
import {StorageTxContext} from "../src/tx-context/storage-tx-context.js";
import {randomBytes} from "@aldea/core/support/util";

describe('execute txs', () => {
  let storage: Storage
  let vm: VM
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let abiFor: (key: string) => Abi
  let abiForCoin: () => Abi
  let modIdFor: (key: string) => Uint8Array



  let flockArgs: ArgsBuilder
  let ctrArgs: ArgsBuilder
  let antArgs: ArgsBuilder
  let sheepArgs: ArgsBuilder
  let coinEaterArgs: ArgsBuilder
  beforeEach(() => {
    const data = buildVm([
      'ant',
      'basic-math',
      'coin-eater',
      'flock',
      'sheep',
      'sheep-counter',
      'weapon'
    ])

    storage = data.storage
    vm = data.vm
    abiFor = (key: string) => storage.getPkg(base16.encode(modIdFor(key))).get().abi
    abiForCoin = () => storage.getPkg(COIN_CLS_PTR.id).get().abi
    modIdFor = data.modIdFor
    flockArgs = new ArgsBuilder('flock', abiFor)
    ctrArgs = new ArgsBuilder('sheep-counter', abiFor)
    antArgs = new ArgsBuilder('ant', abiFor)
    sheepArgs = new ArgsBuilder('sheep', abiFor)
    coinEaterArgs = new ArgsBuilder('coin-eater', abiFor)
  })

  const fundedExec = emptyExecFactoryFactory(() => storage, () => vm)
  const emptyExec = (pubKeys: PubKey[] = []) => {
    const txHash = randomBytes(32)
    const context = new StorageTxContext(txHash, pubKeys, storage, vm)
    return new TxExecution(context)
  }


  it('instantiate creates the right output', () => {
    const {exec, txHash} = fundedExec()
    const mod = exec.import(modIdFor('flock'))
    const instanceIndex = exec.instantiate(mod.idx, 0, new Uint8Array([0]))
    exec.lockJig(instanceIndex.idx, userAddr)
    const result = exec.finalize()
    expect(result.outputs).to.have.length(2) // Implicit fund output
    const output = result.outputs[1]
    expect(output.origin.idBuf).to.eql(txHash)
    expect(output.origin.idx).to.eql(1)
    expect(output.lock.type).to.eql(LockType.ADDRESS)
    expect(output.lock.data).to.eql(userAddr.hash)
  })

  it('sends arguments to constructor properly.', () => {
    const {exec} = fundedExec()
    const module = exec.import(modIdFor('weapon')) // index 0
    const bcs = new BCS(abiFor('weapon'));
    const argBuf = bcs.encode('Weapon_constructor', ['Sable Corvo de San Martín', 100000])
    const weapon = exec.instantiate(module.idx, 1, argBuf) // index 1
    exec.lockJig(weapon.idx, userAddr)
    const result = exec.finalize()

    const parsed = bcs.decode('Weapon', result.outputs[1].stateBuf)
    expect(parsed[0]).to.eql('Sable Corvo de San Martín')
    expect(parsed[1]).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const {exec} = fundedExec()
    const importIndex = exec.import(modIdFor('flock'))
    const flock = exec.instantiate(importIndex.idx, 0, new Uint8Array([0]))
    exec.call(flock.idx, 1, new Uint8Array([0]))
    exec.lockJig(flock.idx, userAddr)
    const result = exec.finalize()

    const props = parseOutput(result.outputs[1])
    expect(props['size']).to.eql(1)
  })

  it('can make calls on jigs sending basic parameters', () => {
    const {exec} = fundedExec()
    const pkg = exec.import(modIdFor('flock'))
    const flock = exec.instantiate(pkg.idx, 0, new Uint8Array([0]))
    exec.call(flock.idx, 2, new Uint8Array([0, 7, 0, 0, 0]))
    exec.lockJig(flock.idx, userAddr)
    const result = exec.finalize()

    const parsed = parseOutput(result.outputs[1])
    expect(parsed['size']).to.eql(7)
  })


  it('can make calls on jigs sending jigs as parameters', () => {
    const {exec} = fundedExec()
    const flockWasm = exec.import(modIdFor('flock'))
    const counterWasm = exec.import(modIdFor('sheep-counter'))
    const flock = exec.instantiate(flockWasm.idx, ...flockArgs.constr('Flock', []))
    const counter = exec.instantiate(counterWasm.idx, ...ctrArgs.constr('SheepCounter', []))
    exec.call(flock.idx, ...flockArgs.method('Flock', 'grow', []))
    exec.call(flock.idx, ...flockArgs.method('Flock', 'grow', []))
    exec.call(counter.idx, ...ctrArgs.method('SheepCounter', 'countFlock', [ref(flock.idx)]))
    exec.lockJig(flock.idx, userAddr)
    exec.lockJig(counter.idx, userAddr)
    const result = exec.finalize()

    expect(result.outputs).to.have.length(3)
    const o = parseOutput(result.outputs[2])
    expect(o['sheepCount']).to.eql(2)
    expect(o['legCount']).to.eql(8)
  })

  it('after locking a jig in the code the state gets updated properly', () => {
    const {exec} = fundedExec()
    const flockMod = exec.import(modIdFor('flock'))
    const counterMod = exec.import(modIdFor('sheep-counter'))
    const flock = exec.instantiate(flockMod.idx, ...flockArgs.constr('Flock', []))
    const shepherd = exec.instantiate(counterMod.idx, ...ctrArgs.constr('Shepherd', [ref(flock.idx)]))
    exec.lockJig(shepherd.idx, userAddr)
    const result = exec.finalize()

    const flockOutput = result.outputs[1]
    const shepherdOutput = result.outputs[2]

    expect(flockOutput.lock.type).to.eql(LockType.JIG)
    expect(flockOutput.lock.data).to.eql(shepherdOutput.origin.toBytes())
  })

  type ShepExec = {
    exec: TxExecution,
    flock: StatementResult,
    shepherd: StatementResult
  }

  function shepherdExec (privKeys: PrivKey[] = []): ShepExec {
    const {exec} = fundedExec(privKeys)
    const flockWasm = exec.import(modIdFor('flock'))
    const counterWasm = exec.import(modIdFor('sheep-counter'))
    const flock = exec.instantiate(flockWasm.idx, ...flockArgs.constr('Flock', []))
    exec.call(flock.idx, ...flockArgs.method('Flock', 'grow', []))
    const shepherd = exec.instantiate(counterWasm.idx, ...ctrArgs.constr('Shepherd', [ref(flock.idx)]))
    exec.lockJig(shepherd.idx, userAddr)

    return {
      exec,
      flock,
      shepherd
    }
  }

  it('accessing class ptr works', () => {
    const {
      exec,
    } = shepherdExec([userPriv])

    const result = exec.finalize()
    storage.persistExecResult(result)

    const {exec: exec2} = fundedExec([userPriv])
    const loaded = exec2.load(result.outputs[2].hash)
    const classPtrStmt = exec2.call(loaded.idx, ...ctrArgs.method('Shepherd', 'myClassPtr', []))
    const flockClassPtrStmt = exec2.call(loaded.idx, ...ctrArgs.method('Shepherd', 'flockClassPtr', []))


    const r1 = new BufReader(classPtrStmt.asValue().lift())
    expect(r1.readBytes()).to.eql(new Pointer(modIdFor('sheep-counter'), 1).toBytes())
    const r2 = new BufReader(flockClassPtrStmt.asValue().lift())
    expect(r2.readBytes()).to.eql(new Pointer(modIdFor('flock'), 0).toBytes())
  })

  it('fails if the tx is trying to lock an already locked jig', () => {
    const {exec, flock, shepherd} = shepherdExec()

    expect(() => {
      exec.lockJig(flock.idx, userAddr)
    }).to.throw(
      PermissionError,
      /no permission to unlock jig/
    )

    expect(() => {
      exec.lockJig(shepherd.idx, userAddr)
    }).to.throw(
      PermissionError,
      /Missing signature for/
    )
  })

  it('fails when a jig tries to lock a locked jig', () => {
    const {exec} = fundedExec()
    const flockWasm = exec.import(modIdFor('flock'))
    const counterWasm = exec.import(modIdFor('sheep-counter'))
    const flock = exec.instantiate(flockWasm.idx, ...flockArgs.constr('Flock', []))

    exec.lockJig(flock.idx, userAddr)

    expect(() => exec.instantiate(
      counterWasm.idx, ...ctrArgs.constr('Shepherd', [ref(flock.idx)])
    )).to.throw(PermissionError,
      /Missing signature for/)
  })


  type AntExec = {
    exec: TxExecution,
    ant1: StatementResult,
    ant2: StatementResult,
    ant3: StatementResult
  }

  function antExec (): AntExec {
    const {exec} = fundedExec()
    const antWasm = exec.import(modIdFor('ant'))
    const ant1 = exec.instantiate(antWasm.idx, ...antArgs.constr('Ant', []))
    const ant2 = exec.instantiate(antWasm.idx, ...antArgs.constr('Ant', []))
    const ant3 = exec.instantiate(antWasm.idx, ...antArgs.constr('Ant', []))

    exec.call(ant1.idx, ...antArgs.method('Ant', 'addFriend', [ref(ant2.idx)])) // does not lock to caller
    exec.call(ant1.idx, ...antArgs.method('Ant', 'addChild', [ref(ant3.idx)])) // locks to caller
    exec.lockJig(ant1.idx, userAddr)
    exec.lockJig(ant2.idx, userAddr)
    return {exec, ant1, ant2, ant3}
  }

  it('fails when a jig tries to call a method on a jig of the same class with no permissions', () => {
    const {exec, ant1} = antExec()

    expect(() =>
      exec.call(ant1.idx, ...antArgs.method('Ant', 'forceAFriendToWork', [])) // calls public method on not owned jig
    ).to.throw(PermissionError)
  })

  it('fails when a jig tries to call a protected method on another jig of the same module that does not own', () => {
    const {exec, ant1} = antExec()

    expect(() =>
      exec.call(ant1.idx, ...antArgs.method('Ant', 'forceFriendsFamilyToWork', [])) // calls private method on not owned jig
    ).to.throw(PermissionError)
  })

  describe('when there is a frozen jig', () => {
    let frozenOutput: Output
    beforeEach(() => {
      const {exec} = fundedExec()
      const flockMod = exec.import(modIdFor('flock'))
      const flock = exec.instantiate(flockMod.idx, ...flockArgs.constr('Flock', []))
      exec.call(flock.idx, ...flockArgs.method('Flock', 'goToFridge', []))
      const res = exec.finalize()
      expect(res.outputs[1].lock.type).to.eql(LockType.FROZEN)
      frozenOutput = res.outputs[1]
      storage.persistExecResult(res)
    })

    it('cannot be called methods', () => {
      const {exec} = fundedExec()
      const jig = exec.load(frozenOutput.hash)
      expect(() => exec.call(jig.idx, ...flockArgs.method('Flock', 'grow', []))).to
        .throw(PermissionError,
          /jig is frozen/)
    })

    it('cannot be locked', () => {
      const {exec} = fundedExec()
      const jig = exec.load(frozenOutput.hash)
      expect(() => exec.lockJig(jig.idx, userAddr)).to
        .throw(PermissionError,
          /jig is frozen/)
    })
  });

  it('can load an existing jig', () => {
    const { exec: exec1 } = antExec()
    const res1 = exec1.finalize();
    storage.persistExecResult(res1)

    const { exec: exec2 } = fundedExec([userPriv])

    const loaded = exec2.load(res1.outputs[1].hash)
    exec2.call(loaded.idx, ...antArgs.method('Ant', 'doExercise', []))
    const result = exec2.finalize()

    const antProps = parseOutput(result.outputs[1])

    expect(antProps['ownForce']).to.eql(2)
  })

  it('can load an existing jig by origin', () => {
    const { exec: exec1 } = antExec()
    const res1 = exec1.finalize();
    storage.persistExecResult(res1)

    const { exec: exec2 } = fundedExec([userPriv])

    const loaded = exec2.loadByOrigin(res1.outputs[1].origin.toBytes())
    exec2.call(loaded.idx, ...antArgs.method('Ant', 'doExercise', []))
    const result = exec2.finalize()

    const antProps = parseOutput(result.outputs[1])

    expect(antProps['ownForce']).to.eql(2)
  })

  it('fails when try to load an unknown jig', () => {
    const { exec } = fundedExec()

    expect(() => {
      exec.load(new Uint8Array(32).fill(1))
    }).to.throw(ExecutionError)
  })

  it('fails when try to load by an unknown origin', () => {
    const { exec } = fundedExec()

    expect(() => {
      exec.loadByOrigin(new Uint8Array(34).fill(1))
    }).to.throw(ExecutionError)
  })

  it('can load jigs that include proxies to other packages', () => {
    const { exec: exec1 } = shepherdExec()
    const res1 = exec1.finalize()
    storage.persistExecResult(res1)

    const {exec: exec2} = fundedExec([userPriv])
    const jig = exec2.load(res1.outputs[2].hash)
    const value = exec2.call(jig.idx, ...ctrArgs.method('Shepherd', 'sheepCount', []))
    expect(value.asValue().ptr.toUInt()).to.eql(1)
    const res2 = exec2.finalize()
    expect(res2.outputs).to.have.length(2)
  })

  function flockBagExec (): ExecutionResult {
    const { exec } = fundedExec()
    const flockWasm = exec.import(modIdFor('flock'))
    const flock = exec.exec(flockWasm.idx, ...flockArgs.exec('flockWithSize', [3]))
    const bag = exec.instantiate(flockWasm.idx, ...flockArgs.constr('FlockBag', []))
    exec.call(bag.idx, ...flockArgs.method('FlockBag', 'addFlock', [ref(flock.idx)]))
    exec.lockJig(bag.idx, userAddr)
    return exec.finalize()
  }

  it('can send static method result as parameter', () => {
    const result = flockBagExec()

    const flockState = parseOutput(result.outputs[1])
    expect(flockState.size).to.eql(3)
    const bagState = parseOutput(result.outputs[2])
    expect(bagState.flocks).to.eql([result.outputs[1].origin])
  })

  it('when a child jig is not used it does not appear in the outputs', () => {
    const res1 = flockBagExec()
    storage.persistExecResult(res1)

    const anotherKey = PrivKey.fromRandom()

    const {exec} = fundedExec([userPriv])
    const loadedJig = exec.load(res1.outputs[2].hash)
    exec.lockJig(loadedJig.idx, anotherKey.toPubKey().toAddress())

    const ret2 = exec.finalize()


    expect(ret2.outputs).to.have.length(2) // The internal jig is not loaded because we lazy load.
    expect(ret2.outputs[0].classPtr).to.eql(COIN_CLS_PTR)
    expect(ret2.outputs[1].origin).to.eql(res1.outputs[2].origin)
  })

  it('does not require re lock for address locked jigs.')

  it('can send instance method result as parameter')

  it('understand references in the middle of other structures')

  it('can return types with nested jigs')

  it('can call exported functions from inside jigs', () => {
    const { exec } = fundedExec()
    const flockWasm = exec.import(modIdFor('flock'))
    const flock = exec.instantiate(flockWasm.idx, ...flockArgs.constr('Flock', []))
    exec.call(flock.idx, ...flockArgs.method('Flock', 'groWithExternalFunction', []))
    exec.lockJig(flock.idx, userAddr)
    const res = exec.finalize()

    const parsed = parseOutput(res.outputs[1])
    expect(parsed.size).to.eql(1)
  })

  it('saves entire state for jigs using inheritance', () => {
    const {exec} = fundedExec()
    const wasm = exec.import(modIdFor('sheep'))
    const sheep = exec.instantiate(wasm.idx, ...sheepArgs.constr('MutantSheep', ['Wolverine', 'black']))
    exec.lockJig(sheep.idx, userAddr)
    const res = exec.finalize()

    const reader = new BufReader(res.outputs[1].stateBuf)
    expect(Buffer.from(reader.readBytes()).toString()).to.eql('Wolverine')
    expect(Buffer.from(reader.readBytes()).toString()).to.eql('black')
    expect(reader.readU8()).to.eql(7)
    expect(reader.readU32()).to.eql(0)
  })

  it('can call base class and concrete class methods', () => {
    const {exec} = fundedExec()
    const wasm = exec.import(modIdFor('sheep'))
    const sheep = exec.instantiate(wasm.idx, ...sheepArgs.constr('MutantSheep', ['Wolverine', 'black']))
    exec.call(sheep.idx, ...sheepArgs.method('Sheep', 'chopOneLeg', []))
    exec.call(sheep.idx, ...sheepArgs.method('Sheep', 'chopOneLeg', []))
    exec.call(sheep.idx, ...sheepArgs.method('MutantSheep', 'regenerateLeg', []))

    exec.lockJig(sheep.idx, userAddr)
    const res = exec.finalize()

    const reader = new BufReader(res.outputs[1].stateBuf)
    expect(Buffer.from(reader.readBytes()).toString()).to.eql('Wolverine')
    expect(Buffer.from(reader.readBytes()).toString()).to.eql('black')
    expect(reader.readU8()).to.eql(6)
    expect(reader.readU32()).to.eql(10)
  })

  it('can create, lock and reload a jig that uses inheritance', () => {
    const {exec: exec1} = fundedExec()
    const wasm = exec1.import(modIdFor('sheep'))
    const sheep = exec1.instantiate(wasm.idx, ...sheepArgs.constr('MutantSheep', ['Wolverine', 'black']))
    exec1.lockJig(sheep.idx, userAddr)
    const res1 = exec1.finalize()
    storage.persistExecResult(res1)

    const { exec: exec2 } = fundedExec([userPriv])
    const loaded = exec2.load(res1.outputs[1].hash)
    exec2.call(loaded.idx, ...sheepArgs.method('Sheep', 'chopOneLeg',[])) // -1 leg
    exec2.call(loaded.idx, ...sheepArgs.method('MutantSheep', 'regenerateLeg',[])) // +1 leg
    exec2.lockJig(loaded.idx, userAddr)
    const res2 = exec2.finalize()

    const reader = new BufReader(res2.outputs[1].stateBuf)
    expect(Buffer.from(reader.readBytes()).toString()).to.eql('Wolverine')
    expect(Buffer.from(reader.readBytes()).toString()).to.eql('black')
    expect(reader.readU8()).to.eql(7)
    expect(reader.readU32()).to.eql(10)
  })

  it('coin eater', () => {
    // const txHash = new Uint8Array(32).fill(10)
    // const context = new StorageTxContext(txHash, [userPriv.toPubKey()], storage, vm)

    const {exec} = fundedExec([userPriv])

    const mintedCoin = vm.mint(userAddr, 1000)
    const wasm = exec.import(modIdFor('coin-eater'))
    const coin = exec.load(mintedCoin.hash)
    const eater = exec.instantiate(wasm.idx, ...coinEaterArgs.constr('CoinEater', [ref(coin.idx)]))
    exec.lockJig(eater.idx, userAddr)
    const ret = exec.finalize()
    storage.persistExecResult(ret)

    const eaterState = parseOutput(ret.outputs[1])
    expect(eaterState.lastCoin).to.eql(mintedCoin.origin)
    expect(eaterState.otherCoins).to.eql([])
  })

  it('keeps locking state up to date after lock', () => {
    const { exec} = fundedExec([userPriv])
    const wasm = exec.import(modIdFor('flock'))
    const flock = exec.instantiate(wasm.idx, ...flockArgs.constr('Flock', []))

    exec.lockJig(flock.idx, userAddr)
    exec.call(flock.idx, ...flockArgs.method('Flock', 'grow', [])).idx
    const res = exec.finalize()

    const parsed = parseOutput(res.outputs[1])
    expect(parsed['size']).to.eql(1)
    expect(res.outputs[1].lock.type).to.eql(LockType.ADDRESS)
    expect(res.outputs[1].lock.data).to.eql(userAddr.hash)
  })


  it('can compile', async () => {
    const {exec} = fundedExec()
    const fileContent = 'export class Dummy extends Jig {}'
    const entries = ['main.ts']
    const files = new Map<string, string>([['main.ts', fileContent]])

    await exec.deploy(entries, files)

    const res = exec.finalize()
    expect(res.deploys[0].entries).to.eql(entries)
    expect(res.deploys[0].sources).to.eql(files)
  })

  it('fails if not enough fees there', () => {
    const txHash = new Uint8Array(32).fill(10)
    const context = new StorageTxContext(txHash, [userPriv.toPubKey()], storage, vm)
    const exec = new TxExecution(context)
    const coin = vm.mint(userAddr, 10)
    const stmt = exec.load(coin.hash)
    exec.fund(stmt.idx)
    expect(() => exec.finalize()).to.throw(ExecutionError, 'Not enough funding. Provided: 10. Needed: 100')
  })

  it('generates empty statements for sign and signto', () => {
    const {exec} = fundedExec()
    const stmt1 = exec.sign(new Uint8Array(64).fill(0), new Uint8Array(32).fill(1))
    const stmt2 = exec.signTo(new Uint8Array(64).fill(2), new Uint8Array(32).fill(3))

    expect(() => stmt1.asValue()).to.throw()
    expect(() => stmt1.asContainer()).to.throw()
    expect(() => stmt2.asValue()).to.throw()
    expect(() => stmt2.asContainer()).to.throw()
  })

  it('when call an external constructor a new jig is created a right proxy gets assigned', () => {
    const { exec, shepherd } = shepherdExec([userPriv])
    exec.call(shepherd.idx, ...ctrArgs.method('Shepherd', 'breedANewFlock', [5]))
    const res = exec.finalize()

    expect(res.outputs).to.have.length(4)
    const parsedFlock = parseOutput(res.outputs[3])
    expect(parsedFlock.size).to.eql(5)
  })

  it('input does not include newly created jigs', () => {
    const exec = emptyExec([userPub])  // this loads a coin
    const minted = vm.mint(userAddr, 100)
    const imported = exec.import(modIdFor('flock'))
    const jig = exec.instantiate(imported.idx, 0, new Uint8Array([0]))
    exec.lockJig(jig.idx, userAddr)
    const coin = exec.load(minted.hash)
    exec.fund(coin.idx)

    const res = exec.finalize()

    expect(res.spends).to.have.length(1)
    expect(res.spends[0].id).to.eql(minted.id)
  })

  it('result includes reads', () => {
    const { exec: exec1 } = fundedExec([])  // this loads a coin
    const pkg = exec1.import(modIdFor('sheep'))
    const sheep = exec1.instantiate(pkg.idx, ...sheepArgs.constr('Sheep', ['Baa', 'black']) )
    exec1.lockJig(sheep.idx, userAddr)
    const res1 = exec1.finalize();
    storage.persistExecResult(res1)

    const { exec: exec2 } = fundedExec([])  // this loads a coin
    const loaded = exec2.load(res1.outputs[1].hash)
    const imported = exec2.import(modIdFor('sheep'))
    const cloned = exec2.exec(imported.idx, ...sheepArgs.exec('clone', [ref(loaded.idx)]))
    exec2.lockJig(cloned.idx, userAddr)
    const res2 = exec2.finalize()

    expect(res2.reads).to.have.length(1)
    expect(res2.reads[0].hash).to.eql(res1.outputs[1].hash)
  })

  it('when a read was also spend it does not appear in spends', () => {
    const { exec: exec1 } = fundedExec([])  // this loads a coin
    const pkg = exec1.import(modIdFor('sheep'))
    const sheep = exec1.instantiate(pkg.idx, ...sheepArgs.constr('Sheep', ['Baa', 'black']) )
    exec1.lockJig(sheep.idx, userAddr)
    const res1 = exec1.finalize();
    storage.persistExecResult(res1)

    const { exec: exec2 } = fundedExec([userPriv])  // this loads a coin
    const loaded = exec2.load(res1.outputs[1].hash)
    const imported = exec2.import(modIdFor('sheep'))
    const cloned = exec2.exec(imported.idx, ...sheepArgs.exec('clone', [ref(loaded.idx)]))
    exec2.call(loaded.idx, ...sheepArgs.method('Sheep', 'chopOneLeg', []))
    exec2.lockJig(cloned.idx, userAddr)
    const res2 = exec2.finalize()

    expect(res2.reads).to.have.length(0)
  })

  // it('receives right amount from properties of foreign jigs', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const sheepCountPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
  //   const flock = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
  //   exec.callInstanceMethod(flock, 'grow', [])
  //   exec.callInstanceMethod(flock, 'grow', [])
  //   exec.callInstanceMethod(flock, 'grow', [])
  //   const counter = exec.instantiateByClassName(sheepCountPkg, 'Shepherd', [flock]).asJig()
  //   const methodStmt = exec.callInstanceMethod(counter, 'sheepCount', [])
  //   const method2Stmt = exec.callInstanceMethod(counter, 'flockIdentifier', [])
  //   const value = exec.getStatementResult(methodStmt.idx).value
  //   const value2 = exec.getStatementResult(method2Stmt.idx).value
  //   expect(value).to.eql(3)
  //   expect(value2).to.eql(`Flock with size: 3`)
  // })
  //
  // it('can create external jigs from inside asc', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
  //   const flockStmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
  //   const counterStmt = exec.instantiateByClassName(counterPkg, 'Shepherd', [ref(flockStmt.idx)])
  //   exec.callInstanceMethod(counterStmt.asJig(), 'breedANewFlock', [10])
  //   exec.lockJigToUser(flockStmt.asJig(), userAddr)
  //   exec.lockJigToUser(counterStmt.asJig(), userAddr)
  //   exec.markAsFunded()
  //   const ret = exec.finalize()
  //
  //   expect(ret.outputs).to.have.length(3) // second flock was actually created
  //   const state = ret.outputs[1].parsedState(abiFor('sheep-counter'))
  //   expect(state[0]).to.eql(new Pointer(exec.txContext.tx.id, 2)) // flock was actually relplaced
  // })
  //
  // it('can combine coins owned by a jig inside that jig', () => {
  //   const coin1 = vm.mint(userAddr, 300)
  //   const coin2 = vm.mint(userAddr, 400)
  //   const coin3 = vm.mint(userAddr, 500)
  //   const exec = emptyExec([userPriv])
  //
  //   const coinEaterPkg = exec.importModule(modIdFor('coin-eater')).asInstance
  //   const coin1Jig = exec.loadJigByOutputId(coin1.id()).asJig()
  //   const coin2Jig = exec.loadJigByOutputId(coin2.id()).asJig()
  //   const coin3Jig = exec.loadJigByOutputId(coin3.id()).asJig()
  //   const eaterJig = exec.instantiateByClassName(coinEaterPkg, 'CoinEater', [coin1Jig]).asJig()
  //   exec.callInstanceMethod(eaterJig, 'addCoin', [coin2Jig])
  //   exec.callInstanceMethod(eaterJig, 'addCoin', [coin3Jig])
  //   exec.callInstanceMethod(eaterJig, 'combineAll', [])
  //   exec.lockJigToUser(eaterJig, userAddr)
  //
  //   exec.markAsFunded()
  //   const ret = exec.finalize()
  //
  //   expect(ret.outputs).to.have.length(4)
  //   expect(ret.outputs[1].serializedLock.type).to.eql(-1)
  //   expect(ret.outputs[2].serializedLock.type).to.eql(-1)
  //   expect(ret.outputs[3].serializedLock.type).to.eql(2)
  //   expect(ret.outputs[3].serializedLock.data).to.eql(ret.outputs[0].origin.toBytes())
  //
  //   expect(ret.outputs[3].parsedState(abiForCoin())).to.eql([300n + 400n + 500n])
  //   expect(ret.outputs[0].parsedState(abiFor('coin-eater'))).to.eql([ret.outputs[3].origin, []])
  // })
  //
  // it('can save numbers inside statement result', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
  //   const flockJig = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
  //   exec.callInstanceMethod(flockJig, 'grow', []) // size = 1
  //   exec.callInstanceMethod(flockJig, 'grow', []) // size = 2
  //   const shepherd = exec.instantiateByClassName(counterPkg, 'Shepherd', [flockJig]).asJig()
  //   const methodIdx = exec.callInstanceMethod(shepherd, 'sheepCount', [flockJig]).idx
  //
  //   const statement = exec.getStatementResult(methodIdx);
  //   expect(statement.value).to.eql(2)
  //   expect(statement.abiNode).to.eql(emptyTn('u32'))
  // })
  //
  // it('can save strings inside statement result', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
  //   const flockIdx = exec.instantiateByClassName(flockPkg, 'Flock', [])
  //   const shepherdIdx = exec.instantiateByClassName(counterPkg, 'Shepherd', [ref(flockIdx.idx)])
  //   const methodIdx = exec.callInstanceMethod(shepherdIdx.asJig(), 'flockIdentifier', [ref(flockIdx.idx)])
  //
  //   const statement = exec.getStatementResult(methodIdx.idx)
  //   expect(statement.value).to.eql(`Flock with size: 0`)
  //   expect(statement.abiNode).to.eql(emptyTn('string'))
  // })
  //
  // it('adds statements for locks', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   exec.instantiateByClassName(flockPkg, 'Flock', []).idx
  //   exec.lockJigToUserByIndex(1, userAddr)
  //   const stmt = exec.getStatementResult(2)
  //   expect(stmt).to.be.instanceof(EmptyStatementResult)
  // })
  //
  // it('adds statements for funds', () => {
  //   const minted = vm.mint(userAddr, 100)
  //   const exec = emptyExec([userPriv])
  //   const coinIdx = exec.loadJigByOutputId(minted.id()).idx
  //   exec.fundByIndex(coinIdx)
  //   const stmt = exec.getStatementResult(1)
  //   expect(stmt).to.be.instanceof(EmptyStatementResult)
  // })
  //
  // it('can save arrays of jigs inside statement results', () => {
  //   const antPkg = exec.importModule(modIdFor('ant')).asInstance
  //   const ant1Stmt = exec.instantiateByClassName(antPkg, 'Ant', [])
  //   const ant2Stmt = exec.instantiateByClassName(antPkg, 'Ant', [])
  //   exec.callInstanceMethod(ant1Stmt.asJig(), 'addChildren', [ref(ant2Stmt.idx)])
  //   const methodStmt = exec.callInstanceMethod(ant1Stmt.asJig(), 'getFamily', [ref(ant2Stmt.idx)])
  //
  //   const statement = exec.getStatementResult(methodStmt.idx)
  //   expect(statement.value).to.have.length(1)
  //   expect(statement.value[0].origin).to.eql(new Pointer(exec.txContext.tx.id, 1))
  // })
  //
  // it('fails if an import is tried to use as a jig in the target', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock'))
  //
  //   expect(
  //     () => exec.callInstanceMethodByIndex(flockPkg.idx, 0, new Uint8Array([]))
  //   ).to.throw(ExecutionError)
  // })
  //
  // it('fails if an import is tried to use as a jig in the arguments', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock'))
  //   const counterPkgStmt = exec.importModule(modIdFor('sheep-counter'))
  //
  //   expect(
  //     () => exec.instantiateByIndex(
  //       counterPkgStmt.idx,
  //       counterPkgStmt.asInstance.abi.exportedClassIdxByName('Shepherd'),
  //       new BCS(counterPkgStmt.asInstance.abi.abi).encode('Shepherd_constructor', [ref(flockPkg.idx)])
  //     )
  //   ).to.throw(ExecutionError)
  // })
  //
  // it('fails if a number statement result is tried to be use as a jig', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const counterPkg = exec.importModule(modIdFor('sheep-counter')).asInstance
  //   const flock1Stmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
  //   const flock2Stmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
  //   exec.callInstanceMethod(flock2Stmt.asJig(), 'grow', []) // size = 1
  //   exec.callInstanceMethod(flock2Stmt.asJig(), 'grow', []) // size = 2
  //   const shepherdStmt = exec.instantiateByClassName(counterPkg, 'Shepherd', [ref(flock1Stmt.idx)])
  //   const methodStmt = exec.callInstanceMethod(shepherdStmt.asJig(), 'sheepCount', [])
  //
  //   expect(
  //     () => exec.callInstanceMethodByIndex(
  //       methodStmt.idx,
  //       1,
  //       new BCS(abiFor('sheep-counter')).encode('Shepherd$replace', [ref(0)])
  //     )
  //   ).to.throw(ExecutionError)
  // })
  //
  // it('fails if a jig statement result is tried to be used as an import', () => {
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const flockStmt = exec.instantiateByClassName(flockPkg, 'Flock', [])
  //
  //   expect(
  //     () => exec.instantiateByIndex(flockStmt.idx, 1, new Uint8Array([]))
  //   ).to.throw(ExecutionError)
  // })
  //
  // it('can lock to a new address if there is a signature for the previous one', () => {
  //   const privKey1 = PrivKey.fromRandom()
  //   const addr1 = privKey1.toPubKey().toAddress()
  //   const privKey2 = PrivKey.fromRandom()
  //   const addr2 = privKey2.toPubKey().toAddress()
  //
  //
  //   exec = emptyExec([privKey1])
  //   exec.markAsFunded()
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const flockJig = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
  //   // works, jig was unlocked
  //   exec.lockJigToUser(flockJig, addr1)
  //   // works, jig was locked to addr1, and tx was signed by privKey1
  //   exec.lockJigToUser(flockJig, addr2)
  //   const ret = exec.finalize()
  //
  //   const lock = ret.outputs[0].lockObject()
  //   expect(lock.data).to.eql(addr2.hash)
  // })
  //
  // it('manages correctly buffers', () => {
  //   const exec = emptyExec([userPriv])
  //   const importStmt = exec.importModule(modIdFor('buff-test'))
  //   const newStmt = exec.instantiateByIndex(importStmt.idx, 0, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //   const result = exec.finalize()
  //
  //   const jig = result.outputs[0]
  //
  //   const parsed = jig.parsedState(abiFor('buff-test'))
  //
  //   const buff1 = new ArrayBuffer(16);
  //   new Uint8Array(buff1).fill(255)
  //   expect(parsed[0]).to.eql(buff1)
  //   expect(parsed[1]).to.eql('----------')
  //   const buff2 = new Uint8Array(16)
  //   buff2.fill(255)
  //   expect(parsed[2]).to.eql(buff2)
  //   expect(parsed[3]).to.eql('----------')
  //   const buff3 = new Uint16Array(16)
  //   buff3.fill(255)
  //   expect(parsed[4]).to.eql(buff3)
  //   expect(parsed[5]).to.eql('----------')
  //   const buff4 = new Uint32Array(16)
  //   buff4.fill(255)
  //   expect(parsed[6]).to.eql(buff4)
  //   expect(parsed[7]).to.eql('----------')
  //   const buff5 = new BigUint64Array(16)
  //   buff5.fill(255n)
  //   expect(parsed[8]).to.eql(buff5)
  // })
  //
  //
  // it('can write data in the right place', () => {
  //   const exec = emptyExec([userPriv])
  //   const importStmt = exec.importModule(modIdFor('buff-test'))
  //   const newStmt = exec.instantiateByIndex(importStmt.idx, 0, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //
  //   const newBuff = new Uint16Array(16)
  //   newBuff.fill(2)
  //   newStmt.asJig().writeField('u16', newBuff)
  //
  //   const result = exec.finalize()
  //
  //   const jig = result.outputs[0]
  //
  //   const parsed = jig.parsedState(abiFor('buff-test'))
  //   expect(parsed[4]).to.eql(newBuff)
  // })
  //
  // it('can handle properly different sized props', () => {
  //   const exec = emptyExec([userPriv])
  //   const importStmt = exec.importModule(modIdFor('buff-test'))
  //   const newStmt = exec.instantiateByIndex(importStmt.idx, 1, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //   const result = exec.finalize()
  //
  //   const jig = result.outputs[0]
  //
  //   const parsed = jig.parsedState(abiFor('buff-test'))
  //   const buff1 = new Uint8Array(16)
  //   const buff2 = new Uint16Array(16)
  //   const buff3 = new Uint32Array(16)
  //   const buff4 = new BigUint64Array(16)
  //   buff1.fill(255)
  //   buff2.fill(255)
  //   buff3.fill(255)
  //   buff4.fill(255n)
  //   expect(parsed[0]).to.eql(buff1)
  //   expect(parsed[1]).to.eql(1)
  //   expect(parsed[2]).to.eql(buff2)
  //   expect(parsed[3]).to.eql(2)
  //   expect(parsed[4]).to.eql(buff3)
  //   expect(parsed[5]).to.eql(3)
  //   expect(parsed[6]).to.eql(buff4)
  //   expect(parsed[7]).to.eql(4)
  // })
  //
  // it('can handle properly collections with typed arrays inside', () => {
  //   const exec = emptyExec([userPriv])
  //   const importStmt = exec.importModule(modIdFor('buff-test'))
  //   const newStmt = exec.instantiateByIndex(importStmt.idx, 2, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //   const result = exec.finalize()
  //
  //   const jig = result.outputs[0]
  //
  //   const parsed = jig.parsedState(abiFor('buff-test'))
  //   const buff1 = new Uint16Array(4)
  //   const buff2 = new Uint16Array(4)
  //   const buff3 = new Uint16Array(4)
  //   const buff4 = new Uint16Array(4)
  //   buff1.fill(1)
  //   buff2.fill(2)
  //   buff3.fill(3)
  //   buff4.fill(4)
  //   expect(parsed[0]).to.eql([
  //     buff1,
  //     buff2
  //   ])
  //   expect(parsed[1]).to.eql(new Set([
  //     buff3,
  //     buff4
  //   ]))
  //   const key1 = new Uint16Array(4)
  //   const key2 = new Uint16Array(4)
  //   const value1 = new Uint16Array(4)
  //   const value2 = new Uint16Array(4)
  //   key1.fill(5)
  //   key2.fill(6)
  //   value1.fill(7)
  //   value2.fill(8)
  //   expect(parsed[2]).to.eql(new Map([
  //     [key1, value1],
  //     [key2, value2]
  //   ]))
  //
  //   const static1 = new Uint16Array(4)
  //   const static2 = new Uint16Array(4)
  //   static1.fill(9)
  //   static2.fill(10)
  //   expect(parsed[3]).to.eql([static1, static2])
  // })
  //
  // it('can lower collections containing typed arrays properly', () => {
  //   const exec = emptyExec([userPriv])
  //   const importStmt = exec.importModule(modIdFor('buff-test'))
  //   const newStmt = exec.instantiateByIndex(importStmt.idx, 2, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //   const result = exec.finalize()
  //   storage.persist(result)
  //
  //   const jig = result.outputs[0]
  //
  //   const exec2 = emptyExec([userPriv])
  //   const loadStmt = exec2.loadJigByOutputId(jig.id())
  //   exec2.callInstanceMethodByIndex(loadStmt.idx, 1, new Uint8Array(0))
  //   const result2 = exec2.finalize()
  //
  //   const finalJig = result2.outputs[0]
  //
  //   const parsed = finalJig.parsedState(abiFor('buff-test'))
  //   const array1 = new Uint16Array(4)
  //   const array2 = new Uint16Array(4)
  //   array1.fill(1 * 2)
  //   array2.fill(2 * 2)
  //   expect(parsed[0]).to.eql([
  //     array1,
  //     array2
  //   ])
  //   const set1 = new Uint16Array(4)
  //   const set2 = new Uint16Array(4)
  //   set1.fill(3 * 2)
  //   set2.fill(4 * 2)
  //   expect(parsed[1]).to.eql(new Set([set1, set2]))
  //
  //   const key1 = new Uint16Array(4)
  //   const key2 = new Uint16Array(4)
  //   const value1 = new Uint16Array(4)
  //   const value2 = new Uint16Array(4)
  //   key1.fill(5 * 2)
  //   key2.fill(6 * 2)
  //   value1.fill(7 * 2)
  //   value2.fill(8 * 2)
  //   expect(parsed[2]).to.eql(new Map([
  //     [key1, value1],
  //     [key2, value2]
  //   ]))
  //
  //   const static1 = new Uint16Array(4)
  //   const static2 = new Uint16Array(4)
  //   static1.fill(9 * 2)
  //   static2.fill(10 * 2)
  //   expect(parsed[3]).to.eql([static1, static2])
  // })
  //
  //
  // it('can read data properly for typed arrays', () => {
  //   const exec = emptyExec([userPriv])
  //   const importStmt = exec.importModule(modIdFor('buff-test'))
  //   const newStmt = exec.instantiateByIndex(importStmt.idx, 0, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //
  //   const value = importStmt.asInstance.getPropValue(newStmt.asJig().ref, 0, 'u16')
  //   const buff = new Uint16Array(16)
  //   buff.fill(255)
  //   expect(value.value).to.eql(buff)
  // })
  //
  // it('process booleans in the right way', () => {
  //   let importStmt = exec.importModule(modIdFor('with-booleans'))
  //   let bcs = new BCS(abiFor('with-booleans'))
  //   let args = bcs.encode("WithBooleans_constructor", [true, false])
  //   let newStmt = exec.instantiateByIndex(importStmt.idx, 0, args)
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //   let result = exec.finalize()
  //
  //   let state = result.outputs[0].parsedState(abiFor('with-booleans'))
  //   expect(state).to.eql([true, false])
  // })
  //
  // it('fails when try to fund with a non authorized coin', () => {
  //   let coin = vm.mint(userAddr)
  //
  //   let stmt = exec.loadJigByOutputId(coin.id())
  //
  //   try {
  //     exec.fundByIndex(stmt.idx)
  //     expect.fail("Missign signature")
  //   } catch (e) {
  //     if (e instanceof PermissionError) {
  //       expect(e.message).to.eql(`no permission to remove lock from jig ${coin.origin}`)
  //     } else {
  //       assert.fail("Wrong type of error")
  //     }
  //   }
  // })
  //
  // it('fails when try to fund with a non coin', () => {
  //   let importStmt = exec.importModule(modIdFor('flock'))
  //   let newStmt = exec.instantiateByIndex(importStmt.idx, 0, new Uint8Array())
  //
  //   try {
  //     exec.fundByIndex(newStmt.idx)
  //     expect.fail("Should not allow to fund with something that is not a coin")
  //   } catch (e) {
  //     if (e instanceof ExecutionError) {
  //       expect(e.message).to.eql(`Not a coin: ${exec.txContext.tx.id}_0`)
  //     } else {
  //       assert.fail("Wrong type of error")
  //     }
  //   }
  // })
  //
  // it('operates with booleans correctly', () => {
  //   let importStmt = exec.importModule(modIdFor('with-booleans'))
  //   let bcs = new BCS(abiFor('with-booleans'))
  //   let args = bcs.encode("WithBooleans_constructor", [true, false])
  //   let newStmt = exec.instantiateByIndex(importStmt.idx, 0, args)
  //   exec.callInstanceMethodByIndex(newStmt.idx, 1, new Uint8Array())
  //   exec.lockJigToUserByIndex(newStmt.idx, userAddr)
  //
  //   let result = exec.finalize()
  //   let state = result.outputs[0].parsedState(abiFor('with-booleans'))
  //   expect(state).to.eql([false, true])
  // })
  //
  // it('can lower an imported interface', () => {
  //   const result1 = ((): ExecutionResult => {
  //     const exec1 = emptyExec([userPriv])
  //     const modStmt = exec1.importModule(modIdFor('gym'))
  //     const gymStmt = exec1.instantiateByIndex(modStmt.idx, 0, new Uint8Array())
  //     exec1.lockJigToUserByIndex(gymStmt.idx, userAddr)
  //     return exec1.finalize()
  //   })()
  //   storage.persist(result1)
  //
  //   const result2 = ((): ExecutionResult => {
  //     const exec = emptyExec([userPriv, userPriv])
  //     const modStmt = exec.importModule(modIdFor('runner'))
  //     const runner1 = exec.instantiateByIndex(modStmt.idx, 1, new Uint8Array())
  //     const runner2 = exec.instantiateByIndex(modStmt.idx, 1, new Uint8Array())
  //     exec.lockJigToUserByIndex(runner1.idx, userAddr)
  //     exec.lockJigToUserByIndex(runner2.idx, userAddr)
  //     return exec.finalize()
  //   })()
  //   storage.persist(result2)
  //
  //   const result3 = ((): ExecutionResult => {
  //     const exec = emptyExec([userPriv, userPriv, userPriv])
  //     const load1 = exec.loadJigByOutputId(result2.outputs[0].id())
  //     const load2 = exec.loadJigByOutputId(result2.outputs[1].id())
  //     const loadGym = exec.loadJigByOutputId(result1.outputs[0].id())
  //     const bcs = new BCS(abiFor('gym'))
  //     exec.callInstanceMethodByIndex(loadGym.idx, 1, bcs.encode('Gym$subscribe', [ref(load1.idx)]))
  //     exec.callInstanceMethodByIndex(loadGym.idx, 1, bcs.encode('Gym$subscribe', [ref(load2.idx)]))
  //     return exec.finalize()
  //   })()
  //   storage.persist(result3)
  //
  //   expect(result3.outputs).to.have.length(3)
  //   expect(result3.outputs[1].lockData()).to.eql(result1.outputs[0].origin.toBytes())
  //   expect(result3.outputs[2].lockData()).to.eql(result1.outputs[0].origin.toBytes())
  //   expect(result3.outputs[1].parsedState(abiFor('runner'))).to.eql([[0, 0], 100])
  //   expect(result3.outputs[2].parsedState(abiFor('runner'))).to.eql([[0, 0], 100])
  //
  //   const result4 = ((): ExecutionResult => {
  //     const exec = emptyExec([userPriv, userPriv, userPriv, userPriv])
  //     const load = exec.loadJigByOutputId(result3.outputs[0].id())
  //     const modStmt = exec.importModule(modIdFor('runner'))
  //     const runner = exec.instantiateByIndex(modStmt.idx, 1, new Uint8Array())
  //     const bcs = new BCS(abiFor('gym'))
  //     exec.callInstanceMethodByIndex(load.idx, 1, bcs.encode('Gym$subscribe', [ref(runner.idx)]))
  //     return exec.finalize()
  //   })()
  //   storage.persist(result4)
  //
  //   const parsed = result4.outputs[1].parsedState(abiFor('gym'));
  //   expect(parsed).to.have.length(1)
  //   expect(parsed[0]).to.have.length(3)
  //   expect(parsed[0].map((a: Pointer) => a.toString())).to.have.members([
  //     ...result2.outputs.map(o => o.origin),
  //     result4.outputs[0].origin
  //   ].map((a: Pointer) => a.toString()))
  //
  //
  //   const result5 = ((): ExecutionResult => {
  //     const exec = emptyExec([userPriv, userPriv, userPriv, userPriv, userPriv])
  //     const load = exec.loadJigByOutputId(result4.outputs[1].id())
  //     exec.callInstanceMethodByIndex(load.idx, 2, new Uint8Array(0))
  //     return exec.finalize()
  //   })()
  //   storage.persist(result5)
  //   expect(result5.outputs).to.have.length(4)
  //   expect(result5.outputs[0].classPtr().idBuf).to.eql(modIdFor('gym'))
  //   for (let output of result5.outputs.slice(1)) {
  //     expect(output.classPtr().idBuf).to.eql(modIdFor('runner'))
  //     expect(output.parsedState(abiFor('runner'))).to.eql([[100, 100], 100])
  //   }
  //
  //   const result6 = ((): ExecutionResult => {
  //     const exec = emptyExec([userPriv, userPriv, userPriv, userPriv, userPriv, userPriv])
  //     const gym = exec.loadJigByOutputId(result5.outputs[0].id())
  //     const runner = exec.loadJigByOutputId(result5.outputs[1].id())
  //     const bcs = new BCS(abiFor('gym'))
  //     const unsuscribed = exec.callInstanceMethodByIndex(gym.idx, 3, bcs.encode('Gym$unsubscribe', [ref(runner.idx)]))
  //     exec.lockJigToUserByIndex(unsuscribed.idx, userAddr)
  //     return exec.finalize()
  //   })()
  //
  //   expect(result6.outputs[1].lockData()).to.eql(userAddr.hash)
  // })
  //
  //
  //
  // it('can lock to a new address fails if there is no signature for the previous one', () => {
  //   const privKey1 = PrivKey.fromRandom()
  //   const addr1 = privKey1.toPubKey().toAddress()
  //   const privKey2 = PrivKey.fromRandom()
  //   const addr2 = privKey2.toPubKey().toAddress()
  //
  //
  //   // tx has no signature for privKey1
  //   exec = emptyExec()
  //   exec.markAsFunded()
  //   const flockPkg = exec.importModule(modIdFor('flock')).asInstance
  //   const flockJig = exec.instantiateByClassName(flockPkg, 'Flock', []).asJig()
  //   // works, jig was unlocked
  //   exec.lockJigToUser(flockJig, addr1)
  //
  //   expect(
  //     () => exec.lockJigToUser(flockJig, addr2)
  //   ).to.throw(PermissionError)
  // })
  //
  // it('a tx can be funded in parts', () => {
  //   const tx = new Tx()
  //   tx.push(new SignInstruction(new Uint8Array(), userPub.toBytes()))
  //   ;(<SignInstruction>tx.instructions[0]).sig = ed25519.sign(tx.sighash(), userPriv)
  //   const coin = vm.mint(userAddr, 1000)
  //   exec = new TxExecution(
  //     new ExTxExecContext(
  //       new ExtendedTx(tx, [coin.toOutput()]),
  //       clock,
  //       storage,
  //       vm
  //     )
  //   )
  //
  //   const loaded = exec.loadJigByOutputId(coin.id())
  //   const coin1 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin2 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin3 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin4 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin5 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //
  //   exec.fundByIndex(coin1.idx)
  //   exec.fundByIndex(coin2.idx)
  //   exec.fundByIndex(coin3.idx)
  //   exec.fundByIndex(coin4.idx)
  //   exec.fundByIndex(coin5.idx) // adds up 100
  //
  //   const result = exec.finalize()
  //
  //   expect(result.outputs[0].parsedState(abiForCoin())[0]).to.eql(900n)
  //   expect(result.outputs[1].lockType()).to.eql(LockType.FROZEN)
  //   expect(result.outputs[2].lockType()).to.eql(LockType.FROZEN)
  //   expect(result.outputs[3].lockType()).to.eql(LockType.FROZEN)
  //   expect(result.outputs[4].lockType()).to.eql(LockType.FROZEN)
  //   expect(result.outputs[5].lockType()).to.eql(LockType.FROZEN)
  // })
  //
  // it('fails is not eunogh parts', () => {
  //   const tx = new Tx()
  //   tx.push(new SignInstruction(new Uint8Array(), userPub.toBytes()))
  //   ;(<SignInstruction>tx.instructions[0]).sig = ed25519.sign(tx.sighash(), userPriv)
  //   const coin = vm.mint(userAddr, 1000)
  //   exec = new TxExecution(
  //     new ExTxExecContext(
  //       new ExtendedTx(tx, [coin.toOutput()]),
  //       clock,
  //       storage,
  //       vm
  //     )
  //   )
  //
  //   const loaded = exec.loadJigByOutputId(coin.id())
  //   const coin1 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin2 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin3 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin4 = exec.callInstanceMethod(loaded.asJig(), 'send', [20])
  //   const coin5 = exec.callInstanceMethod(loaded.asJig(), 'send', [19])
  //
  //   exec.fundByIndex(coin1.idx)
  //   exec.fundByIndex(coin2.idx)
  //   exec.fundByIndex(coin3.idx)
  //   exec.fundByIndex(coin4.idx)
  //   exec.fundByIndex(coin5.idx) // adds up 99
  //
  //   expect(() => exec.finalize()).to.throw(ExecutionError, 'Not enough funding. Provided: 99. Needed: 100')
  // })
})
