import { Transaction } from '../vm/transaction.js'
import { NewInstruction } from '../vm/new-instruction.js'
import { CallInstruction } from '../vm/call-instruction.js'
import { VM } from '../vm/vm.js'
import { CBOR } from 'cbor-redux'
import { expect } from 'chai'
import { Storage } from '../vm/storage.js'
import { LoadInstruction } from '../vm/load-instruction.js'
import { LiteralArg } from '../vm/literal-arg.js'
import { JigArg } from '../vm/jig-arg.js'

const parse =  (data) => CBOR.decode(data.buffer, null, { mode: "sequence" })

describe('execute txs', () => {
  let storage
  beforeEach(() => {
    storage = new Storage()
  })

  it('can create a fighter', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/fighter.wasm', []))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_1').stateBuf)
    expect(parsed.get(0)).to.eql(100)
    expect(parsed.get(1)).to.eql('tx1_0')
  })

  it('can create a sword', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/sword.wasm', []))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(1)
  })

  it('can equip a sword', async () => {
    const tx = new Transaction('tx1')
    tx.add(new NewInstruction('v2/fighter.wasm'), [])
    tx.add(new NewInstruction('v2/sword.wasm', []))
    tx.add(new CallInstruction(0, 'equipLeftHand', [new JigArg(1)]))

    const vm = new VM(storage)
    await vm.execTx(tx)
    const parsed = parse(storage.getJigState('tx1_0').stateBuf)
    expect(parsed.get(0)).to.eql(1)
  })
})
