import { describe } from "mocha"
import { Transaction } from "../vm/transaction.js"
import { LoadInstruction } from "../vm/instructions/load-instruction.js"
import blake3 from 'blake3-wasm'
import { expect } from "chai"
import { NewInstruction } from "../vm/instructions/new-instruction.js"
import { LockInstruction } from "../vm/instructions/lock-instruction.js"
import { CallInstruction } from "../vm/instructions/call-instruction.js"
import { LiteralArg } from "../vm/literal-arg.js"
import { JigArg } from "../vm/jig-arg.js"
import { UnlockInstruction } from "../vm/instructions/unlock-instruction.js"

describe('Transaction#encode', () => {
  it('it returns correct hash for a tx with one load instruction', () => {
    const tx = new Transaction()
      tx.add(new LoadInstruction('someLocation'))


    expect(tx.id).to.eql(blake3.hash('LOAD someLocation').toString('hex'))
  })

  it('it returns correct hash for a tx with a new instruction with no args', () => {
    const tx = new Transaction()
    tx.add(new NewInstruction('v1/sword.wasm', 'Sword', []))

    expect(tx.id).to.eql(blake3.hash('NEW v1/sword.wasm Sword').toString('hex'))
  })

  it('it returns correct hash for a tx with args', () => {
    const tx = new Transaction()
    tx.add(new NewInstruction('v1/sword.wasm', 'Sword', [new LiteralArg("foo"), new LiteralArg(10), new JigArg(101)]))

    expect(tx.id).to.eql(blake3.hash('NEW v1/sword.wasm Sword "foo" 10 $101').toString('hex'))
  })

  it('it returns correct hash for a tx with a lock instruction', () => {
    const tx = new Transaction()
    tx.add(new LockInstruction(0, 'somepubkey'))


    expect(tx.id).to.eql(blake3.hash('LOCK $0 "somepubkey"').toString('hex'))
  })

  it('it returns correct hash for a tx with a call instruction with no args', () => {
    const tx = new Transaction()
    tx.add(new CallInstruction(0, 'm1', []))

    expect(tx.id).to.eql(blake3.hash('CALL $0 m1').toString('hex'))
  })

  it('it returns correct hash for a tx with a call instruction with a literal string arg', () => {
    const tx = new Transaction()
    tx.add(new CallInstruction(0, 'm1', [new LiteralArg('foo')]))

    expect(tx.id).to.eql(blake3.hash('CALL $0 m1 "foo"').toString('hex'))
  })

  it('it returns correct hash for a tx with a call instruction with a literal number arg', () => {
    const tx = new Transaction()
    tx.add(new CallInstruction(0, 'm1', [new LiteralArg(1)]))

    expect(tx.id).to.eql(blake3.hash('CALL $0 m1 1').toString('hex'))
  })

  it('it returns correct hash for a tx with a call instruction with a jig arg', () => {
    const tx = new Transaction()
    tx.add(new CallInstruction(0, 'm1', [new JigArg(0)]))

    expect(tx.id).to.eql(blake3.hash('CALL $0 m1 $0').toString('hex'))
  })

  it('it returns a correct hash for tx with a call instruction with multiple args', () => {
    const tx = new Transaction()
    tx.add(new CallInstruction(0, 'm1', [new LiteralArg('foo'), new LiteralArg(100), new JigArg(0)]))

    expect(tx.id).to.eql(blake3.hash('CALL $0 m1 "foo" 100 $0').toString('hex'))
  })

  it('it returns a correct hash for tx with an unlock instruction', () => {
    const tx = new Transaction()
    tx.add(new UnlockInstruction(0, 'somekey'))

    expect(tx.id).to.eql(blake3.hash('UNLOCK $0 "somekey"').toString('hex'))
  })

  it('it renders multiple instructions', () => {
    const tx = new Transaction()
      .add(new NewInstruction('some-class.wasm', 'SomeClass', [new LiteralArg("foo")]))
      .add(new CallInstruction(0, 'm1', [new JigArg(1)]))
      .add(new LockInstruction(0, 'somekey'))

    expect(tx.id).to.eql(blake3.hash([
      'NEW some-class.wasm SomeClass "foo"',
      'CALL $0 m1 $1',
      'LOCK $0 "somekey"'
    ].join('\n')).toString('hex'))
  })
})