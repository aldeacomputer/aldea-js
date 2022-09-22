import { Transaction } from '../vm/transaction.js'
import { NewInstruction } from '../vm/instructions/new-instruction.js'
import { CallInstruction } from '../vm/instructions/call-instruction.js'
import { VM } from '../vm/vm.js'
import { CBOR } from 'cbor-redux'
import { expect } from 'chai'
import { Storage } from '../vm/storage.js'
import { LoadInstruction } from '../vm/instructions/load-instruction.js'
import { JigArg } from '../vm/jig-arg.js'
import { ExecutionError, PermissionError } from "../vm/errors.js"
import { LockInstruction } from "../vm/instructions/lock-instruction.js"
import { UserLock } from "../vm/locks/user-lock.js"
import { UnlockInstruction } from "../vm/instructions/unlock-instruction.js"
import { locationF } from "../vm/location.js"

const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })

const FIGHTER_MODULE = 'manual/v2/fighter.wasm'
const SWORD_MODULE = 'manual/v2/sword.wasm'

describe('execute txs', () => {
  let storage
  const userKey = 'somePubKey'
  beforeEach(() => {
    storage = new Storage()
  })

  it('throws an error if a new instance is not locked', () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction(SWORD_MODULE, 'Sword', []))

    const vm = new VM(storage)
    expect(() => vm.execTx(tx)).to.throw(PermissionError, `unlocked jig: ${locationF(tx, 0)}`)
  })

  it('can create a fighter', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState(locationF(tx, 0)).stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(1)).to.eql(locationF(tx, 1))
  })

  it('can create a sword', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction(SWORD_MODULE, 'Sword', []))
    tx.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState(locationF(tx, 0)).stateBuf)
    expect(parsed.get(0)).to.eql(1)
  })

  it('can equip a sword', async () => {
    const tx = new Transaction()
    tx.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx.add(new NewInstruction(SWORD_MODULE, 'Sword', []))
    tx.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState(locationF(tx, 0)).stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(1)).to.eql(locationF(tx, 2)) // sword is equiped and reflected in the state
  })

  it('a new fighter has an empty stash', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState(locationF(tx, 0)).stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(2)).to.eql([])
  })

  it('a fighter with a sword has the hand in the stash', async () => {
    const tx = new Transaction()
    tx.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx.add(new NewInstruction(SWORD_MODULE, 'Sword', []))
    tx.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState(locationF(tx, 0)).stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(2)).to.eql([locationF(tx, 1)])
  })

  it('once the sword was owned by the fighter it cannot be used outside', () => {
    const tx1 = new Transaction()
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userKey))

    const tx2 = new Transaction('tx2')
    tx2.add(new LoadInstruction(locationF(tx1, 2)))
    tx2.add(new UnlockInstruction(0, userKey))
    tx2.add(new CallInstruction(0, 'use', []))

    const vm = new VM(storage)
    vm.execTx(tx1)
    expect(() => vm.execTx(tx2)).to.throw(PermissionError, 'jig locks can only by used by the owner jig')
  })

  it('locking a locked jig fails', () => {
    const tx1 = new Transaction()
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userKey))
    tx1.add(new LockInstruction(2, userKey)) // the sword is controlled by the fighter

    const vm = new VM(storage)
    expect(() => vm.execTx(tx1)).to.throw(ExecutionError, `no permission to remove lock from jig ${locationF(tx1, 2)}`)
  })

  it('once the sword was owned is stored with a proper jig lock', () => {
    const tx1 = new Transaction()
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    vm.execTx(tx1)

    const state = storage.getJigState(locationF(tx1, 2))
    expect(state.lock).to.eql({
      type: 'JigLock',
      data: {
        origin: locationF(tx1, 0)
      }
    })
  })

  it('when a jig releases a child jig there is an error if the jig is not locked', () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new CallInstruction(0, 'releaseSomething', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    expect(() => vm.execTx(tx1)).to.throw(PermissionError, `unlocked jig: ${locationF(tx1, 1)}`) // origin for the hand jig
  })

  it('when a jig releases a child it can be locked later', () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction(FIGHTER_MODULE, 'Fighter', []))
    tx1.add(new NewInstruction(SWORD_MODULE, 'Sword',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new CallInstruction(0, 'releaseSomething', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userKey))
    tx1.add(new LockInstruction(1, userKey))

    const vm = new VM(storage)
    vm.execTx(tx1)

    const state = storage.getJigState(locationF(tx1, 1))
    expect(state.lock).to.eql({
      type: 'UserLock',
      data: {
        pubkey: userKey
      }
    })
  })
})
