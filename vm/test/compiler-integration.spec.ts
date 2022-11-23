import {Transaction} from '../vm/transaction.js'
import {
  Storage,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {locationF} from '../vm/location.js'
import {
  CallInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  Signature,
  VariableContent,
  NumberArg,
  StringArg,
  ExecInstruction, PrivKey, BufferArg, AssignInstruction, Location
} from '@aldea/sdk-js'
import {ExecutionError, PermissionError} from "../vm/errors.js";
import {TxExecution} from "../vm/tx-execution.js";
import {UserLock} from "../vm/locks/user-lock.js";

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
  //
  it('can create a flock', () => {
    const tx = new Transaction()

    const exec = new TxExecution(tx, vm)
    exec.instantiate('aFlock', modIdFor('flock'), 'Flock', [0])
    exec.lockJigByVarName('aFlock', new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(0)
  })

  it('can use a constructor with arguments', () => {
    const tx = new Transaction()
    const exec = new TxExecution(tx, vm)
    exec.instantiate('aSword', modIdFor('weapon'), 'Weapon', ['Sable Corvo de San Martín', 100000])
    exec.lockJigByVarName('aSword', new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql('Sable Corvo de San Martín')
    expect(parsed[1]).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const tx = new Transaction()

    const aFlock = 'aFlock'
    const exec = new TxExecution(tx, vm)
    exec.instantiate(aFlock, modIdFor('flock'), 'Flock', [0])
    const jig = exec.getJigRefByVarName(aFlock)
    exec.callInstanceMethod(jig, 'grow', [])
    exec.lockJigByVarName(aFlock, new UserLock(userAddr))
    exec.finalize()
    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
  })

  it('can call remote static methods inside the assembly scrypt code', () => {
    const tx = new Transaction()

    const flockVar = 'aFlock'
    const exec = vm.execTx(tx)
    exec.instantiate(flockVar, modIdFor('flock'), 'Flock', [])
    const flockJig = exec.getJigRefByVarName(flockVar)
    exec.callInstanceMethod(flockJig, 'growWithMath', [])
    exec.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
  })

  it('can create a flock and call a method with an argument', () => {
    const amount = 15;
    const tx = new Transaction()


    const flockVar = 'aFlock'
    const exec = new TxExecution(tx, vm)
    exec.instantiate(flockVar, modIdFor('flock'), 'Flock', [0])
    const flockJig = exec.getJigRefByVarName(flockVar)
    exec.callInstanceMethod(flockJig, 'growMany', [amount])
    exec.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(amount)
  })

  it('can create a sheep counter', () => {
    const tx = new Transaction()

    const varName = 'aCounter'
    const exec = new TxExecution(tx, vm)
    exec.instantiate(varName, modIdFor('sheep-counter'), 'SheepCounter', [])
    exec.lockJigByVarName(varName, new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(0)
    expect(parsed[1]).to.eql(0)
  })

  it('can call methods over a sheep counter', () => {
    const tx = new Transaction()

    const varName = 'aCounter'
    const exec = new TxExecution(tx, vm)
    exec.instantiate(varName, modIdFor('sheep-counter'), 'SheepCounter', [])
    const jig = exec.getJigRefByVarName(varName)
    exec.callInstanceMethod(jig, 'countSheep', [])
    exec.lockJigByVarName(varName, new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
    expect(parsed[1]).to.eql(4)
  })

  it('can send a jig as a parameter', () => {
    const tx = new Transaction()

    const flockVar = 'aFlock'
    const counterVar = 'aCounter'
    const exec = new TxExecution(tx, vm)
    const counterJig = exec.instantiate(counterVar, modIdFor('sheep-counter'), 'SheepCounter', [])
    const flockJig = exec.instantiate(flockVar, modIdFor('flock'), 'Flock', [0])
    exec.callInstanceMethod(flockJig, 'grow', [])
    exec.callInstanceMethod(flockJig, 'grow', [])
    exec.callInstanceMethod(counterJig, 'countFlock', [flockJig])
    exec.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec.lockJigByVarName(counterVar, new UserLock(userAddr))
    exec.finalize()

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(2)
    expect(parsed[1]).to.eql(8)
  })

  it('can use a jig in a second tx', () => {
    const tx1 = new Transaction()


    const tx2 = new Transaction().add(new AssignInstruction('var', 0)) // just changing txid
    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))


    const flockVar = 'aFlock'
    const counterVar = 'aCounter'
    const exec1 = new TxExecution(tx1, vm)
    const counterJig1 = exec1.instantiate(counterVar, modIdFor('sheep-counter'), 'SheepCounter', [])
    const flockJig1 = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock', [0])
    exec1.callInstanceMethod(flockJig1, 'growMany', [2])
    exec1.callInstanceMethod(counterJig1, 'countFlock', [flockJig1])
    exec1.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec1.lockJigByVarName(counterVar, new UserLock(userAddr))
    exec1.finalize()

    storage.persist(exec1)

    const exec2 = new TxExecution(tx2, vm)
    const counterJig2 = exec2.loadJigIntoVariable(counterVar, new Location(tx1.hash(), 0), false, false)
    exec2.callInstanceMethod(counterJig2, 'countSheep', [])
    exec2.lockJigByVarName(counterVar, new UserLock(userAddr))
    exec2.finalize()

    const parsed = exec2.outputs[0].parsedState()
    expect(parsed[0]).to.eql(3)
    expect(parsed[1]).to.eql(12)
  })

  it('can create a Shepherd', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'growMany', [new NumberArg(2)]))
      .add(new NewInstruction('aShepherd', modIdFor('sheep-counter'), 'Shepherd' ,[new VariableContent('aFlock')]))
      .add(new LockInstruction('aShepherd', userAddr))

    const flockVar = 'aFlock'
    const shepherdVar = 'aShepherd'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock' ,[])
    const shepherdJig = exec1.instantiate(shepherdVar, modIdFor('sheep-counter'), 'Shepherd' ,[flockJig])
    exec1.lockJigByVarName(shepherdVar, new UserLock(userAddr))
    exec1.finalize()


    const parsed = exec1.outputs[1].parsedState()
    expect(parsed[0].name).to.eql('Flock')
    expect(Location.fromBuffer(parsed[0].originBuf).toString()).to.eql(`${tx1.id}_o0`)
  })

  it('a shepard can replace its flock a new tx', () => {
    const tx1 = new Transaction()

    const tx2 = new Transaction().add(new AssignInstruction('a', 0)) //different txid
    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))

    const flockVar = 'aFlock'
    const shepherdVar = 'aShepherd'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig1 = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock', [0])
    exec1.instantiate(shepherdVar, modIdFor('sheep-counter'), 'Shepherd', [flockJig1])
    exec1.lockJigByVarName(shepherdVar, new UserLock(userAddr))
    exec1.finalize()

    storage.persist(exec1)

    const exec2 = new TxExecution(tx2, vm)
    const anotherFlock = exec2.instantiate('anotherFlock', modIdFor('flock'), 'Flock', [0])
    const shepherdJig2 = exec2.loadJigIntoVariable(shepherdVar, new Location(tx1.hash(), 1), false, false)
    exec2.callInstanceMethod(shepherdJig2, 'replace', [anotherFlock])
    exec2.lockJigByVarName(shepherdVar, new UserLock(userAddr))
    exec2.assignToVar(flockVar, 2)
    exec2.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec2.finalize()


    const parsed = exec2.outputs[1].parsedState()
    expect(parsed[0].name).to.eql('Flock')
    expect(Location.fromBuffer(parsed[0].originBuf).toString()).to.eql(`${tx2.id}_o0`)
  })

  it('checks the permision on nested operations', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'growMany', [new NumberArg(2)]))
      .add(new NewInstruction('aShepherd',  modIdFor('sheep-counter'), 'Shepherd' ,[new VariableContent('aFlock')]))
      .add(new LockInstruction('aShepherd', userAddr))

    const tx2 = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new LoadInstruction('aShepherd', locationF(tx1, 1)))
      .add(new CallInstruction('aCounter', 'countShepherd', [new VariableContent('aShepherd')]))
      .add(new LockInstruction('aCounter', userAddr))
      .add(new LockInstruction('aShepherd', userAddr))

    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))



    const flockVar = 'aFlock'
    const shepherdVar = 'aShepherd'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig1 = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock', [0])
    exec1.callInstanceMethod(flockJig1, 'growMany', [2])
    exec1.instantiate(shepherdVar, modIdFor('sheep-counter'), 'Shepherd', [flockJig1])
    exec1.lockJigByVarName(shepherdVar, new UserLock(userAddr))
    exec1.finalize()

    storage.persist(exec1)

    const counterVar = 'aCounter'
    const exec2 = new TxExecution(tx2, vm)
    const counterJig = exec2.instantiate(counterVar, modIdFor('sheep-counter'), 'SheepCounter', [])
    const shepherdJig2 = exec2.loadJigIntoVariable(shepherdVar, new Location(tx1.hash(), 1), false, false)
    exec2.callInstanceMethod(counterJig, 'countShepherd', [shepherdJig2])
    exec2.lockJigByVarName(shepherdVar, new UserLock(userAddr))
    exec2.lockJigByVarName(counterVar, new UserLock(userAddr))
    exec2.finalize()


    const parsed = exec2.outputs[0].parsedState()

    expect(parsed[0]).to.eql(2)
    expect(parsed[1]).to.eql(10)
  })

  it('can lock to a user from a jig method', () => {
    const tx1 = new Transaction()

    const exec1 = new TxExecution(tx1, vm)
    const flockJig = exec1.instantiate('aFlock', modIdFor('flock'), 'Flock', [2])
    const flockJig2 = exec1.instantiate('aFlock', modIdFor('flock'), 'Flock', [3])
    const shepherdJig = exec1.instantiate('aShepherd', modIdFor('sheep-counter'), 'Shepherd', [flockJig])
    exec1.callInstanceMethod(shepherdJig, 'replaceAndSendTo', [flockJig2, userAddr.hash])
    exec1.lockJigByVarName('aShepherd', new UserLock(userAddr))
    exec1.finalize()

    expect(exec1.outputs[0].serializedLock.type).to.eql('UserLock')
  })

  it('checks the permission on nested operations and works when valid', () => {
    const tx = new Transaction()

    expect(() => {
      const exec = new TxExecution(tx, vm)
      const tvJig = exec.instantiate('aTv', modIdFor('tv'), 'TV' ,[])
      const remoteJig = exec.instantiate('aRemote', modIdFor('remote-control'), 'RemoteControl' ,[tvJig])
      const userJig = exec.instantiate('aTvUser', modIdFor('remote-control'), 'TVUser' ,[remoteJig])
      exec.callInstanceMethod(userJig, 'watchTvFromCouch', [userJig])
      exec.lockJigByVarName('aTvUser', new UserLock(userAddr))
      exec.finalize()
    }).not.to.throw()
  })

  it('checks the permision on nested operations and fails when invalid', () => {
    const tx = new Transaction()

    expect(() => {
      const exec = new TxExecution(tx, vm)
      const tvJig = exec.instantiate('aTv', modIdFor('tv'), 'TV' ,[])
      const remoteJig = exec.instantiate('aRemote', modIdFor('remote-control'), 'RemoteControl' ,[tvJig])
      const userJig = exec.instantiate('aTvUser', modIdFor('remote-control'), 'TVUser' ,[remoteJig])
      exec.callInstanceMethod(userJig, 'watchTvFromTheFloor', [userJig])
      exec.lockJigByVarName('aTvUser', new UserLock(userAddr))
      exec.finalize()
    }).to.throw()
  })

  it('throws error when tx not signed by the owner', () => {
    const tx1 = new Transaction()

    const tx2 = new Transaction()
      .add(new AssignInstruction('a', 0)) // differnt txid

    const exec1 = new TxExecution(tx1, vm)
    exec1.instantiate('aTv', modIdFor('tv'), 'TV' ,[])
    exec1.lockJigByVarName('aTv', new UserLock(userAddr))
    exec1.finalize()

    storage.persist(exec1)

    const exec2 = new TxExecution(tx2, vm)
    exec2.loadJigIntoVariable('tv1', new Location(tx1.hash(), 0), false, false)
    expect(() => {
      exec2.lockJigByVarName('tv1', new UserLock(userAddr))
    }).to.throw()
  })

  it('does not throw if tx was signed by the owner', () => {
    const tx1 = new Transaction()

    const tx2 = new Transaction()
      .add(new AssignInstruction('a', 0)) // differnt txid
    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))

    const exec1 = new TxExecution(tx1, vm)
    exec1.instantiate('aTv', modIdFor('tv'), 'TV' ,[])
    exec1.lockJigByVarName('aTv', new UserLock(userAddr))
    exec1.finalize()

    storage.persist(exec1)

    const exec2 = new TxExecution(tx2, vm)
    exec2.loadJigIntoVariable('tv1', new Location(tx1.hash(), 0), false, false)
    expect(() => {
      exec2.lockJigByVarName('tv1', new UserLock(userAddr))
    }).not.to.throw()
  })

  it('can call static methods from inside jigs', () => {
    const tx1 = new Transaction()

    const flockVar = 'aFlock'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock' ,[])
    exec1.callInstanceMethod(flockJig, 'grow', [])
    exec1.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec1.finalize()

    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from inside jigs sending other jig as parameters', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new NewInstruction('aShepherd', modIdFor('sheep-counter'), 'Shepherd', [new VariableContent('aFlock')]))
      .add(new CallInstruction('aShepherd', 'growFlockUsingInternalTools', []))
      .add(new LockInstruction('aShepherd', userAddr))

    const flockVar = 'aFlock'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock' ,[])
    exec1.callInstanceMethod(flockJig, 'grow', [])
    exec1.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec1.finalize()

    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from inside jigs sending other jig as parameters (2)', () => {
    const tx1 = new Transaction()

    const flockVar = 'aFlock'
    const shepherdVar = 'aShepherd'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock' ,[])
    const shepherdJig = exec1.instantiate(shepherdVar, modIdFor('sheep-counter'), 'Shepherd' ,[flockJig])
    exec1.callInstanceMethod(shepherdJig, 'growFlockUsingExternalTools', [])
    exec1.lockJigByVarName(shepherdVar, new UserLock(userAddr))
    exec1.finalize()

    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from inside module sending other jig as parameters', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new ExecInstruction('someVar', modIdFor('flock'), 'InternalFlockOperations_growFlock' , [new VariableContent('aFlock')]))
      .add(new LockInstruction('aFlock', userAddr))

    const flockVar = 'aFlock'
    const exec1 = new TxExecution(tx1, vm)
    const flockJig = exec1.instantiate(flockVar, modIdFor('flock'), 'Flock' ,[])
    exec1.execStaticMethod('someVar', modIdFor('flock'), 'InternalFlockOperations', 'growFlock',[flockJig])
    exec1.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec1.finalize()

    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from top level.', () => {
    const tx1 = new Transaction()

    const flockVar = 'aFlock'
    const exec1 = new TxExecution(tx1, vm)
    exec1.execStaticMethod(flockVar, modIdFor('flock'), 'Flock', 'createWithSize',[10])
    exec1.lockJigByVarName(flockVar, new UserLock(userAddr))
    exec1.finalize()

    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(10)
  })

  it('can call static functions from top level.', () => {
    const tx1 = new Transaction()
      .add(new ExecInstruction('aCounter' ,modIdFor('sheep-counter'), 'buildSomeSheepCounter' , [new NumberArg(10)]))
      .add(new LockInstruction('aCounter', userAddr))

    const counterVar = 'aCounter'
    const exec1 = new TxExecution(tx1, vm)
    exec1.execFunction(counterVar, modIdFor('sheep-counter'), 'buildSomeSheepCounter',[10])
    exec1.lockJigByVarName(counterVar, new UserLock(userAddr))
    exec1.finalize()

    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(0)
  })

  it('authcheck allows the call when jig has no lock.', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new CallInstruction('aCounter', 'secureCountFlock', [new VariableContent('aFlock')]))
      .add(new LockInstruction('aFlock', userAddr))
      .add(new LockInstruction('aCounter', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const state = exec1.outputs[1].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('authcheck returns false when jig has no permission to call', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new LockInstruction('aFlock', userAddr))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aFlock', locationF(tx1, 0), true))
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new CallInstruction('aCounter', 'secureCountFlock', [new VariableContent('aFlock')]))
      .add(new LockInstruction('aCounter', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    const state = exec2.outputs[1].parsedState()
    expect(state[0]).to.eql(0)
  })

  it('authcheck returns true when jig has permission to adopt', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aPowerUp', modIdFor('weapon'), 'PowerUp' ,[new NumberArg(1)]))
      .add(new NewInstruction('aWeapon', modIdFor('weapon'), 'Weapon' ,[new StringArg('sword'), new NumberArg(0)]))
      .add(new CallInstruction('aWeapon', 'safeIncorporate', [new VariableContent('aPowerUp')]))
      .add(new LockInstruction('aWeapon', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)

    const state = exec1.outputs[1].parsedState()
    expect(state[1]).to.eql(1)
  })

  it('authcheck returns false when jig has no permission to adopt', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aPowerUp', modIdFor('weapon'), 'PowerUp' ,[new NumberArg(1)]))
      .add(new LockInstruction('aPowerUp', userAddr))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aPowerUp', locationF(tx1, 0), true))
      .add(new NewInstruction('aWeapon', modIdFor('weapon'), 'Weapon' ,[new StringArg('sword'), new NumberArg(0)]))
      .add(new CallInstruction('aWeapon', 'safeIncorporate', [new VariableContent('aPowerUp')]))
      .add(new LockInstruction('aWeapon', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    const state = exec2.outputs[1].parsedState()
    expect(state[1]).to.eql(0)
  })

  it('can set auth to pubkey over self', () => {
    const anotherKey = PrivKey.fromRandom().toPubKey().toAddress()
    const tx1 = new Transaction()
      .add(new NewInstruction('aWeapon', modIdFor('weapon'), 'Weapon' ,[new NumberArg(1)]))
      .add(new CallInstruction('aWeapon', 'send', [new BufferArg(anotherKey.hash)]))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)

    const state = exec1.outputs[0]
    expect(state.serializedLock.type).to.eql('UserLock')
  })

  it(' authcheck returns true when can adopt', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new LockInstruction('aFlock', userAddr))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aFlock', locationF(tx1, 0), true))
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new CallInstruction('aCounter', 'secureCountFlock', [new VariableContent('aFlock')]))
      .add(new LockInstruction('aCounter', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    const state = exec2.outputs[1].parsedState()
    expect(state[0]).to.eql(0)
  })

  it('can lock to public', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('forever-counter'), 'ForeverCounter', []))
      .add(new CallInstruction('aCounter', 'init',  []))

    const exec1 = vm.execTx(tx)
    expect(exec1.outputs[0].serializedLock).to.eql({ type: 'PublicLock' })
  })

  it('can make calls to locked to public jigs', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('forever-counter'), 'ForeverCounter', []))
      .add(new CallInstruction('aCounter', 'init',  []))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aCounter', locationF(tx1, 0)))
      .add(new CallInstruction('aCounter', 'inc', []))

    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    expect(exec2.outputs[0].parsedState()[0]).to.eql(1)
  })

  it('cannot lock public jigs to a user', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('forever-counter'), 'ForeverCounter', []))
      .add(new CallInstruction('aCounter', 'init',  []))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aCounter', locationF(tx1, 0)))
      .add(new LockInstruction('aCounter', userAddr))

    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    expect(() => vm.execTx(tx2)).to.throw(PermissionError, `no permission to remove lock from jig ${exec1.outputs[0].origin}`)
  })

  it('a tx can be signed', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[new NumberArg(2)]))
      .add(new CallInstruction('aFlock', 'grow' ,[]))
      .add(new LockInstruction('aFlock', userAddr))

    const data = Buffer.from(tx.serialize());
    const sig = Signature.from(userPriv, data)
    tx.addSignature(sig)

    const vm = new VM(storage)
    vm.execTx(tx)

    expect(tx.signaturesAreValid()).to.eql(true)
  })
})
