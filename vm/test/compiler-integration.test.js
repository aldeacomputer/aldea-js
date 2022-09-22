import { Transaction } from '../vm/transaction.js'
import { NewInstruction } from '../vm/instructions/new-instruction.js'
import { CallInstruction } from '../vm/instructions/call-instruction.js'
import { VM } from '../vm/vm.js'
import { CBOR } from 'cbor-redux'
import { expect } from 'chai'
import { Storage } from '../vm/storage.js'
import { LoadInstruction } from '../vm/instructions/load-instruction.js'
import { LiteralArg } from '../vm/literal-arg.js'
import { JigArg } from '../vm/jig-arg.js'
import { LockInstruction } from "../vm/instructions/lock-instruction.js"
import { UnlockInstruction } from "../vm/instructions/unlock-instruction.js"
import { locationF } from "../vm/location.js"

const parse = (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })

describe('execute txs', () => {
  let storage
  const userKey = 'pubkey'
  beforeEach(() => {
    storage = new Storage()
  })

  it('can create a sheep counter and call a method', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new CallInstruction(0, 'countSheep', []))
      .add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    vm.execTx(tx)

    const parsed = parse(storage.getJigState(locationF(tx, 0)).stateBuf)
    expect(parsed.get(0)).to.eql(1)
  })

  it('can create a sheep counter and then re hidrate it and then call a method', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new LockInstruction(0, userKey))

    const counterOrigin = locationF(tx1, 0)

    const tx2 = new Transaction()
      .add(new LoadInstruction(counterOrigin))
      .add(new UnlockInstruction(0, userKey))
      .add(new CallInstruction(0, 'countSheep', []))
      .add(new LockInstruction(0, userKey))

    const vm = new VM(storage)
    vm.execTx(tx1)
    vm.execTx(tx2)

    const parsed = parse(storage.getJigState(counterOrigin).stateBuf)
    expect(parsed.get(0)).to.eql(1)
  })

  it('can create a sheep counter and count a flock', () => {
    // this fails because the proxies are expecting a pointer instead of a buf ref.
    const tx1 = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new LockInstruction(0, userKey))

    const tx2 = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(10)]))
      .add(new LockInstruction(0, userKey))

    const counterOrigin = locationF(tx1, 0)
    const flockOrigin = locationF(tx2, 0)

    const tx3 = new Transaction()
      .add(new LoadInstruction(counterOrigin))
      .add(new LoadInstruction(flockOrigin))
      .add(new UnlockInstruction(0, userKey))
      .add(new UnlockInstruction(1, userKey))
      .add(new CallInstruction(0, 'countFlock', [new JigArg(1)]))
      .add(new LockInstruction(0, userKey))
      .add(new LockInstruction(1, userKey))

    const vm = new VM(storage)
    vm.execTx(tx1)
    vm.execTx(tx2)
    vm.execTx(tx3)

    const parsed = parse(storage.getJigState(counterOrigin).stateBuf)
    expect(parsed.get(0)).to.eql(40)
  })
})