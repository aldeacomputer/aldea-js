import { Transaction } from '../vm/transaction.ts'
import { NewInstruction } from '../vm/index.ts'
import { CallInstruction } from '../vm/index.ts'
import { VM } from '../vm/vm.ts'
import { expect } from 'chai'
import { Storage } from '../vm/storage.ts'
import { LoadInstruction } from '../vm/index.ts'
import { LiteralArg } from '../vm/arguments/literal-arg.ts'
import { JigArg } from '../vm/arguments/jig-arg.ts'
import { LockInstruction } from "../vm/index.ts"
import { UnlockInstruction } from "../vm/index.ts"
import { locationF } from "../vm/location.ts"
import { AldeaCrypto } from "../vm/aldea-crypto.ts"
import { Signature } from "../vm/signature.ts"
import { ExecutionError } from "../vm/errors.ts"

const SWORD_MODULE = 'manual/v1/sword.wasm'
const FIGHTER_MODULE = 'manual/v1/fighter.wasm'

describe('execute txs', () => {
  let storage
  const userPrivateKey = AldeaCrypto.randomPrivateKey()
  const userKey = AldeaCrypto.publicKeyFromPrivateKey(userPrivateKey)
  const userLock = () => userKey
  beforeEach(() => {
    storage = new Storage()
  })

  it('can create a sword and call a method', () => {
    const tx = new Transaction()
    tx.add(new NewInstruction(SWORD_MODULE, 'Sword', [new LiteralArg('excalibur')]))
    tx.add(new CallInstruction(0, 'sharp', []))
    tx.add(new LockInstruction(0, userLock()))

    const vm = new VM(storage)
    const execution = vm.execTx(tx)
    const parsed = execution.outputs[0].parsedState()
    expect(parsed[0]).to.eql('excalibur')
    expect(parsed[1]).to.eql(2)
  })

  it('can persist state of the sword', () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(SWORD_MODULE,  'Sword',[new LiteralArg('excalibur')]))
    tx1.add(new CallInstruction(0, 'sharp', []))
    tx1.add(new LockInstruction(0, userKey))
    tx1.addSignature(Signature.from(userPrivateKey, tx1.serialize()))

    const tx2 = new Transaction('tx1')
    tx2.add(new LoadInstruction(locationF(tx1, 0)))
    tx2.add(new UnlockInstruction(0, userKey))
    tx2.add(new CallInstruction(0, 'sharp', []))
    tx2.add(new LockInstruction(0, userKey))
    tx2.addSignature(Signature.from(userPrivateKey, tx2.serialize()))

    const vm = new VM(storage)
    const execution1 = vm.execTx(tx1)
    storage.persist(execution1)
    const execution2 = vm.execTx(tx2)
    const parsed = execution2.outputs[0].parsedState()
    expect(parsed[0]).to.eql('excalibur')
    expect(parsed[1]).to.eql(3)
  })

  it('can create a fighter', async () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Eduardo')]))
    tx1.add(new LockInstruction(0, userLock()))

    const vm = new VM(storage)
    const execution = vm.execTx(tx1)
    const parsed = execution.outputs[0].parsedState()
    expect(parsed[0]).to.eql('Eduardo')
  })

  it('a frighter fresly made stores null in its sword state', async () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Eduardo')]))
    tx1.add(new LockInstruction(0, userLock()))

    const vm = new VM(storage)
    const execution = vm.execTx(tx1)
    const parsed = execution.outputs[0].parsedState()
    expect(parsed[2]).to.eql(null)
  })

  it('can equip a sword into a fighter', async () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword', [new LiteralArg('Masamune')]))
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Goro')]))
    tx1.add(new LockInstruction(0, userLock()))
    tx1.add(new LockInstruction(1, userLock()))

    const tx2 = new Transaction('tx2')
    tx2.add(new LoadInstruction(locationF(tx1, 0)))
    tx2.add(new LoadInstruction(locationF(tx1, 1)))
    tx2.add(new UnlockInstruction(1, userKey))
    tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))
    tx2.add(new LockInstruction(1, userLock()))

    const vm = new VM(storage)
    const exec1 =  vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    const parsed2 = exec2.outputs[1].parsedState()
    expect(parsed2[2]).to.eql(locationF(tx1, 0))
  })

  it('can equip a sword into a fighter and then the fighter can be bring back into context with right attributes', async () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword', [new LiteralArg('Masamune')]))
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Goro')]))
    tx1.add(new LockInstruction(0, userLock()))
    tx1.add(new LockInstruction(1, userLock()))

    const tx2 = new Transaction('tx2')
    tx2.add(new LoadInstruction(locationF(tx1, 0)))
    tx2.add(new LoadInstruction(locationF(tx1, 1)))
    tx2.add(new UnlockInstruction(1, userKey))
    tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))
    tx2.add(new LockInstruction(1, userLock()))


    const tx3 = new Transaction('tx3')
    tx3.add(new LoadInstruction(locationF(tx2, 1)))
    tx3.add(new UnlockInstruction(0, userKey))
    tx3.add(new CallInstruction(0, 'sharpSword', []))
    tx3.add(new LockInstruction(0, userLock()))


    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    storage.persist(exec2)
    const exec3 = vm.execTx(tx3)

    const parsedFighter = exec3.outputs[0].parsedState()
    expect(parsedFighter[1]).to.eql(99)
    expect(parsedFighter[2]).to.eql(locationF(tx1, 0))

    const parsedSword = exec3.outputs[1].parsedState()
    expect(parsedSword[1]).to.eql(2)
  })

  it('a fighter can attack another fighter', async () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword', [new LiteralArg('Masamune')]))
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Goro')]))
    tx1.add(new LockInstruction(0, userLock()))
    tx1.add(new LockInstruction(1, userLock()))

    const tx2 = new Transaction('tx2')
    tx2.add(new LoadInstruction(locationF(tx1, 0)))
    tx2.add(new LoadInstruction(locationF(tx1, 1)))
    tx2.add(new UnlockInstruction(1, userKey))
    tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))
    tx2.add(new LockInstruction(1, userLock()))

    const tx3 = new Transaction('tx3')
    tx3.add(new LoadInstruction(locationF(tx2, 1)))
    tx3.add(new UnlockInstruction(0, userKey))
    tx3.add(new CallInstruction(0, 'sharpSword', []))
    tx3.add(new LockInstruction(0, userLock()))

    const tx4 = new Transaction('tx4')
    tx4.add(new LoadInstruction(locationF(tx3, 0)))
    tx4.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Target')]))
    tx4.add(new UnlockInstruction(0, userKey))
    tx4.add(new CallInstruction(0, 'attack', [new JigArg(1)]))
    tx4.add(new LockInstruction(0, userLock()))
    tx4.add(new LockInstruction(1, userLock()))


    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    storage.persist(exec2)
    const exec3 = vm.execTx(tx3)
    storage.persist(exec3)

    const parsedSword = exec3.outputs[1].parsedState()
    expect(parsedSword[1]).to.eql(2)
    const exec4 = vm.execTx(tx4)

    const parsedFighter = exec4.outputs[1].parsedState()
    expect(parsedFighter[1]).to.eql(97)
    expect(parsedFighter[2]).to.eql(null)
  })

  it('a jig can be loaded using an old location', async () => {
    const tx1 = new Transaction()
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Goro')]))
    tx1.add(new LockInstruction(0, userLock()))

    const tx2 = new Transaction()
    tx2.add(new LoadInstruction(locationF(tx1, 0)))
    tx2.add(new UnlockInstruction(0, userKey))
    tx2.add(new CallInstruction(0, 'takeDamage', [ new LiteralArg(1) ]))
    tx2.add(new LockInstruction(0, userLock()))

    const tx3 = new Transaction()
    tx3.add(new LoadInstruction(locationF(tx1, 0))) // load using origin
    tx3.add(new UnlockInstruction(0, userKey))
    tx3.add(new CallInstruction(0, 'takeDamage', [ new LiteralArg(1) ]))
    tx3.add(new LockInstruction(0, userLock()))


    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    storage.persist(exec2)
    const exec3 = vm.execTx(tx2)
    storage.persist(exec3)

    const parsedFighter = exec3.outputs[0].parsedState()
    expect(parsedFighter[1]).to.eql(98)
  })

  it('when a tx loads forcing a location fails if the location was already spend', async () => {
    const tx1 = new Transaction()
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Goro')]))
    tx1.add(new LockInstruction(0, userLock()))

    const tx2 = new Transaction()
    tx2.add(new LoadInstruction(locationF(tx1, 0)))
    tx2.add(new UnlockInstruction(0, userKey))
    tx2.add(new CallInstruction(0, 'takeDamage', [ new LiteralArg(1) ]))
    tx2.add(new LockInstruction(0, userLock()))

    const tx3 = new Transaction()
    tx3.add(new LoadInstruction(locationF(tx1, 0), true)) // load using origin and forcing location
    tx3.add(new UnlockInstruction(0, userKey))
    tx3.add(new CallInstruction(0, 'takeDamage', [ new LiteralArg(1) ]))
    tx3.add(new LockInstruction(0, userLock()))


    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    storage.persist(exec2)
    expect(() => vm.execTx(tx3)).to.throw(ExecutionError, '')
  })

  it.skip('40000 txs', async () => {
    let i = 10000
    while (i--) {
      const tx1 = new Transaction('tx1')
      tx1.add(new NewInstruction(SWORD_MODULE, 'Sword', [new LiteralArg('Masamune')]))
      tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Goro')]))
      tx1.add(new LockInstruction(0, userLock()))
      tx1.add(new LockInstruction(1, userLock()))

      const tx2 = new Transaction('tx2')
      tx2.add(new LoadInstruction(locationF(tx1, 0)))
      tx2.add(new LoadInstruction(locationF(tx1, 1)))
      tx2.add(new UnlockInstruction(1, userKey))
      tx2.add(new CallInstruction(1, 'equip', [new JigArg(0)]))
      tx2.add(new LockInstruction(1, userLock()))


      const tx3 = new Transaction('tx3')
      tx3.add(new LoadInstruction(locationF(tx2, 1)))
      tx3.add(new UnlockInstruction(0, userKey))
      tx3.add(new CallInstruction(0, 'sharpSword', []))
      tx3.add(new LockInstruction(0, userLock()))

      const tx4 = new Transaction('tx4')
      tx4.add(new LoadInstruction(locationF(tx3, 0)))
      tx4.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', [new LiteralArg('Target')]))
      tx4.add(new UnlockInstruction(0, userKey))
      tx4.add(new CallInstruction(0, 'attack', [new JigArg(1)]))
      tx4.add(new LockInstruction(0, userLock()))
      tx4.add(new LockInstruction(1, userLock()))

      const vm = new VM(storage)
      const exec1 = vm.execTx(tx1)
      storage.persist(exec1)
      const exec2 = vm.execTx(tx2)
      storage.persist(exec2)
      const exec3 = vm.execTx(tx3)
      storage.persist(exec3)
      vm.execTx(tx4)
    }
  })
})
