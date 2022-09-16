import { Transaction } from '../vm/transaction.js'
import { NewInstruction } from '../vm/new-instruction.js'
import { CallInstruction } from '../vm/call-instruction.js'
import { VM } from '../vm/vm.js'
import { CBOR } from 'cbor-redux'
import { expect } from 'chai'
import { Storage } from '../vm/storage.js'
import { LoadInstruction } from '../vm/load-instruction.js'
import { JigArg } from '../vm/jig-arg.js'
import { UnlockInstruction } from "../vm/unlock-instruction.js"
import { PermissionError } from "../vm/permission-error.js"
import { LockInstruction } from "../vm/lock-instruction.js"
import { UserLock } from "../vm/locks/user-lock.js"

const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })

describe('execute txs', () => {
  let storage
  const userLock = new UserLock('userKey');
  beforeEach(() => {
    storage = new Storage()
  })

  it('throws an error if a new instance is not locked', () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/sword.wasm', []))

    const vm = new VM(storage)
    expect(() => vm.execTx(tx)).to.throw(PermissionError, 'unlocked jig: tx1_0')
  })

  it('can create a fighter', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/fighter.wasm', []))
    tx.add(new LockInstruction(0, userLock))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(1)).to.eql('tx1_1')
  })

  it('can create a sword', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/sword.wasm', []))
    tx.add(new LockInstruction(0, userLock))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(1)
  })

  it('can equip a sword', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/fighter.wasm', []))
    tx.add(new NewInstruction('v2/sword.wasm', []))
    tx.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx.add(new LockInstruction(0, userLock))
    tx.add(new LockInstruction(2, userLock))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(1)).to.eql('tx1_2') // sword is equiped and reflected in the state
  })

  it('a new fighter has an empty stash', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/fighter.wasm', []))
    tx.add(new LockInstruction(0, userLock))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(2)).to.eql([])
  })

  it('a fighter with a sword has the hand in the stash', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/fighter.wasm', []))
    tx.add(new NewInstruction('v2/sword.wasm', []))
    tx.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx.add(new LockInstruction(0, userLock))
    tx.add(new LockInstruction(2, userLock))


    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(2)).to.eql(['tx1_1'])
  })

  it('once the sword was owned by the fighter it cannot be used outside', () => {
    const tx1 = new Transaction('tx1')
    tx1.add(new NewInstruction('v2/fighter.wasm', []))
    tx1.add(new NewInstruction('v2/sword.wasm',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userLock))
    tx1.add(new LockInstruction(2, userLock))

    const tx2 = new Transaction('tx2')
    tx2.add(new LoadInstruction('tx1_2'))
    tx2.add(new CallInstruction(0, 'use', []))

    const vm = new VM(storage)
    vm.execTx(tx1)

    expect(() => vm.execTx(tx2)).to.throw(PermissionError)
  })

  it('once the sword was owned is stored with a proper jig lock', () => {
    const userKey = 'user1Key'
    const tx1 = new Transaction('tx1')
    tx1.add(new UnlockInstruction(userKey))
    tx1.add(new NewInstruction('v2/fighter.wasm', []))
    tx1.add(new NewInstruction('v2/sword.wasm',[]))
    tx1.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(2)]))
    tx1.add(new LockInstruction(0, userLock))
    tx1.add(new LockInstruction(2, userLock))

    const vm = new VM(storage)
    vm.execTx(tx1)

    const state = storage.getJigState('tx1_0')
    expect(state.lock).to.eql(userLock)
  })



  // it('cbors stuff', () => {
  //   const seq = Sequence.from([[]])
  //   const buf = CBOR.encode(seq)
  //   expect(buf.byteLength).to.eql(1)
  // })
})
