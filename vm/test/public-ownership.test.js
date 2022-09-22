import { Transaction } from '../vm/transaction.js'
import { NewInstruction } from '../vm/instructions/new-instruction.js'
import { VM } from '../vm/vm.js'
import { CBOR } from 'cbor-redux'
import { expect } from 'chai'
import { Storage } from '../vm/storage.js'
import { LockInstruction } from "../vm/instructions/lock-instruction.js"
import { UserLock } from "../vm/locks/user-lock.js"
import { locationF } from "../vm/location.js"

const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" }).data
const FIGHT_MODULE = 'manual/v2/fight.wasm'

describe('execute txs', () => {
  let storage, vm
  const userLock = () => new UserLock('somePubKey');
  // const userkey = 'somePubKey'


  beforeEach(() => {
    storage = new Storage()
    vm = new VM(storage)
  })


  it('a match can be created', () => {
    // const tx1 = new Transaction('tx1')
    //   .add(new NewInstruction('v2/fighter.wasm', []))
    //   .add(new NewInstruction('v2/fighter.wasm', []))
    //   .add(new LockInstruction(0, userLock())) // jig 1 is the hand
    //   .add(new LockInstruction(2, userLock()))

    const tx1 = new Transaction('tx1')
      // .add(new LoadInstruction('tx1_0'))
      // .add(new LoadInstruction('tx1_2'))
      // .add(new UnlockInstruction(0, userkey))
      // .add(new UnlockInstruction(1, userkey))
      .add(new NewInstruction(FIGHT_MODULE, 'Fight', []))
      .add(new LockInstruction(0, userLock()))

    vm.execTx(tx1)
    // vm.execTx(tx2)

    const state = storage.getJigState(locationF(tx1, 0))
    const parsed = parse(state.stateBuf)
    expect(parsed[0]).to.eql([])
  })

  it('can add fighters to a match', () => {

  })
})
