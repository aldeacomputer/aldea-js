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
import {PermissionError} from "../vm/errors.js";

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
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[new NumberArg(0)]))
      .add(new LockInstruction('aFlock', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(0)
  })

  it('can use a constructor with arguments', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aSword', modIdFor('weapon'), 'Weapon' ,[
        new StringArg('Sable Corvo de San Martín'),
        new NumberArg(100000)
      ]))
      // .add(new CallInstruction(0, 'countSheep', []))
      .add(new LockInstruction('aSword', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql('Sable Corvo de San Martín')
    expect(parsed[1]).to.eql(100000)
  })

  it('can call methods on jigs', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[ new NumberArg(0)]))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new LockInstruction('aFlock', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
  })

  it('can call remote static methods inside the assembly scrypt code', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[ new NumberArg(0)]))
      .add(new CallInstruction('aFlock', 'growWithMath', []))
      .add(new LockInstruction('aFlock', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
  })

  it('can create a flock and call a method with an argument', () => {
    const amount = 15;
    const tx = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[ new NumberArg(0)]))
      .add(new CallInstruction('aFlock', 'growMany', [new NumberArg(amount)]))
      .add(new LockInstruction('aFlock', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(amount)
  })

  it('can create a sheep counter', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new LockInstruction('aCounter', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(0)
    expect(parsed[1]).to.eql(0)
  })

  it('can call methods over a sheep counter', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new CallInstruction('aCounter', 'countSheep' ,[]))
      .add(new LockInstruction('aCounter', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
    expect(parsed[1]).to.eql(4)
  })

  it('can send a jig as a parameter', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new CallInstruction('aCounter', 'countFlock' ,[new VariableContent('aFlock')]))
      .add(new LockInstruction('aCounter', userAddr))
      .add(new LockInstruction('aFlock', userAddr))

    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(2)
    expect(parsed[1]).to.eql(8)
  })

  it('can use a jig in a second tx', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aCounter', modIdFor('sheep-counter'), 'SheepCounter' ,[]))
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'growMany' ,[new NumberArg(2)]))
      .add(new CallInstruction('aCounter', 'countFlock' ,[new VariableContent('aFlock')]))
      .add(new LockInstruction('aCounter', userAddr))
      .add(new LockInstruction('aFlock', userAddr))


    const tx2 = new Transaction()
      .add(new LoadInstruction( 'aCounter', locationF(tx1, 0)))
      .add(new CallInstruction('aCounter', 'countSheep' ,[new VariableContent('aCounter')]))
      .add(new LockInstruction('aCounter', userAddr))

    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)

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

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const parsed = exec1.outputs[1].parsedState()
    expect(parsed[0].name).to.eql('Flock')
    expect(Location.fromBuffer(parsed[0].originBuf).toString()).to.eql(`${tx1.id}_o0`)
  })

  it('a shepard can replace its flock a new tx', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[new NumberArg(2)]))
      .add(new NewInstruction('aShepherd', modIdFor('sheep-counter'), 'Shepherd' ,[new VariableContent('aFlock')]))
      .add(new LockInstruction('aShepherd', userAddr))

    const tx2 = new Transaction()
      .add(new NewInstruction('anotherFlock', modIdFor('flock'), 'Flock' ,[new NumberArg(5)]))
      .add(new LoadInstruction('aShepherd', locationF(tx1, 1)))
      .add(new CallInstruction('aShepherd', 'replace', [new VariableContent('anotherFlock')]))
      .add(new LockInstruction('aShepherd', userAddr))
      .add(new AssignInstruction('aFlock', 2))
      .add(new LockInstruction('aFlock', userAddr)) // Released jig

    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)

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

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    const parsed = exec2.outputs[0].parsedState()

    expect(parsed[0]).to.eql(2)
    expect(parsed[1]).to.eql(10)
  })

  it('can lock to a user from a jig method', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[new NumberArg(2)]))
      .add(new NewInstruction('anotherFlock', modIdFor('flock'), 'Flock' ,[new NumberArg(3)]))
      .add(new NewInstruction('aShepherd', modIdFor('sheep-counter'), 'Shepherd' ,[new VariableContent('aFlock')]))
      .add(new CallInstruction('aShepherd', 'replaceAndSendTo', [new VariableContent('anotherFlock'), new StringArg(userAddr.hash)]))
      .add(new LockInstruction('aShepherd', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)

    expect(exec1.outputs[0].serializedLock.type).to.eql('UserLock')
  })

  it('checks the permission on nested operations and works when invalid', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aTv', modIdFor('tv'), 'TV' ,[]))
      .add(new NewInstruction('aRemote', modIdFor('remote-control'), 'RemoteControl' ,[new VariableContent('aTv')]))
      .add(new NewInstruction('aTvUser', modIdFor('remote-control'), 'TVUser' ,[new VariableContent('aRemote')]))
      .add(new CallInstruction('aTvUser', 'watchTvFromCouch' ,[new VariableContent('aTvUser')]))
      .add(new LockInstruction('aTvUser', userAddr))

    const vm = new VM(storage)
    vm.execTx(tx)
    expect(() => vm.execTx(tx)).not.to.throw()
  })

  it('checks the permision on nested operations and fails when invalid', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aTv', modIdFor('tv'), 'TV' ,[]))
      .add(new NewInstruction('aControl',modIdFor('remote-control'), 'RemoteControl' ,[new VariableContent('aTv')]))
      .add(new NewInstruction('aTvUser', modIdFor('remote-control'), 'TVUser' ,[new VariableContent('aControl')]))
      .add(new CallInstruction('aTvUser', 'watchTvFromTheFloor' ,[new VariableContent('aTvUser')]))
      .add(new LockInstruction('aTvUser', userAddr))

    const vm = new VM(storage)
    expect(() => vm.execTx(tx)).to.throw()
  })

  it('throws error when tx not signed by the owner', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aTv', modIdFor('tv'), 'TV' ,[]))
      .add(new LockInstruction('aTv', userAddr))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aTv', locationF(tx1, 0), false))
      .add(new LockInstruction('aTv', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    expect(() => vm.execTx(tx2)).to.throw()
  })

  it('does not throw if tx was signed by the owner', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aTv', modIdFor('tv'), 'TV' ,[]))
      .add(new LockInstruction('aTv', userAddr))

    const tx2 = new Transaction()
      .add(new LoadInstruction('aTv', locationF(tx1, 0), false))
      .add(new LockInstruction('aTv', userAddr))

    tx2.addSignature(Signature.from(userPriv, Buffer.from(tx2.serialize())))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    vm.execTx(tx2)
    expect(() => vm.execTx(tx2)).not.to.throw()
  })

  it('can call static methods from inside jigs', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new CallInstruction('aFlock', 'grow', []))
      .add(new LockInstruction('aFlock', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from inside jigs sending other jig as parameters', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new NewInstruction('aShepherd', modIdFor('sheep-counter'), 'Shepherd', [new VariableContent('aFlock')]))
      .add(new CallInstruction('aShepherd', 'growFlockUsingInternalTools', []))
      .add(new LockInstruction('aShepherd', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from inside jigs sending other jig as parameters (2)', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new NewInstruction('aShepherd', modIdFor('sheep-counter'), 'Shepherd', [new VariableContent('aFlock')]))
      .add(new CallInstruction('aShepherd', 'growFlockUsingExternalTools', []))
      .add(new LockInstruction('aShepherd', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from inside module sending other jig as parameters', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aFlock', modIdFor('flock'), 'Flock' ,[]))
      .add(new ExecInstruction('someVar', modIdFor('flock'), 'InternalFlockOperations_growFlock' , [new VariableContent('aFlock')]))
      .add(new LockInstruction('aFlock', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(1)
  })

  it('can call static methods from top level.', () => {
    const tx1 = new Transaction()
      .add(new ExecInstruction('aFlock' ,modIdFor('flock'), 'Flock_createWithSize' , [new NumberArg(10)]))
      .add(new LockInstruction('aFlock', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const state = exec1.outputs[0].parsedState()
    expect(state[0]).to.eql(10)
  })

  it('can call static functions from top level.', () => {
    const tx1 = new Transaction()
      .add(new ExecInstruction('aCounter' ,modIdFor('sheep-counter'), 'buildSomeSheepCounter' , [new NumberArg(10)]))
      .add(new LockInstruction('aCounter', userAddr))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
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
