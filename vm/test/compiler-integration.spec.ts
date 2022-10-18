import {Transaction} from '../vm/transaction.js'
import {
  CallInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  Storage,
  UnlockInstruction,
  VM
} from '../vm/index.js'
import {expect} from 'chai'
import {AldeaCrypto} from "../vm/aldea-crypto.js";
import {LiteralArg} from "../vm/arguments/literal-arg.js";
import {JigArg} from "../vm/arguments/jig-arg.js";
import {locationF} from '../vm/location.js'
import {Signature} from "../vm/signature.js";

describe('execute txs', () => {
  let storage: Storage
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  beforeEach(() => {
    storage = new Storage()
  })
  //
  it('can create a flock', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(0)]))
      // .add(new CallInstruction(0, 'countSheep', []))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(0)
  })

  it('can create a flock with initial size', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(10)]))
      // .add(new CallInstruction(0, 'countSheep', []))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(10)
  })

  it('can create a flock and call a method', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[ new LiteralArg(0)]))
      .add(new CallInstruction(0, 'grow', []))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
  })

  it('can create a flock and call a method with an argument', () => {
    const amount = 15;
    const tx = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[ new LiteralArg(0)]))
      .add(new CallInstruction(0, 'growMany', [new LiteralArg(amount)]))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(amount)
  })

  it('can create a sheep counter', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(0)
    expect(parsed[1]).to.eql(0)
  })

  it('can call methods over a sheep counter', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new CallInstruction(0, 'countSheep' ,[]))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(1)
    expect(parsed[1]).to.eql(4)
  })

  it('can send a jig as a parameter', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(2)]))
      .add(new CallInstruction(0, 'countFlock' ,[new JigArg(1)]))
      .add(new LockInstruction(0, userPub))
      .add(new LockInstruction(1, userPub))

    const vm = new VM(storage)
    const exec = vm.execTx(tx)

    const parsed = exec.outputs[0].parsedState()
    expect(parsed[0]).to.eql(2)
    expect(parsed[1]).to.eql(8)
  })

  it('can use a jig in a second tx', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(2)]))
      .add(new CallInstruction(0, 'countFlock' ,[new JigArg(1)]))
      .add(new LockInstruction(0, userPub))
      .add(new LockInstruction(1, userPub))


    const tx2 = new Transaction()
      .add(new LoadInstruction(locationF(tx1, 0)))
      .add(new UnlockInstruction(0, userPub ))
      .add(new CallInstruction(0, 'countSheep' ,[new JigArg(1)]))
      .add(new LockInstruction(0, userPub))

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
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(2)]))
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'Shepherd' ,[new JigArg(0)]))
      .add(new LockInstruction(1, userPub))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    const parsed = exec1.outputs[1].parsedState()
    expect(parsed[0].name).to.eql('Flock')
    expect(Buffer.from(parsed[0].origin).toString()).to.eql(`${tx1.id}_0`)
  })

  it('a shepard can replace its flock a new tx', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(2)]))
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'Shepherd' ,[new JigArg(0)]))
      .add(new LockInstruction(1, userPub))

    const tx2 = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(5)]))
      .add(new LoadInstruction(locationF(tx1, 1)))
      .add(new UnlockInstruction(1, userPub))
      .add(new CallInstruction(1, 'replace', [ new JigArg(0) ]))
      .add(new LockInstruction(1, userPub))
      .add(new LockInstruction(0, userPub))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)

    const parsed = exec2.outputs[1].parsedState()
    expect(parsed[0].name).to.eql('Flock')
    expect(Buffer.from(parsed[0].origin).toString()).to.eql(`${tx2.id}_0`)
  })

  it('checks the permision on nested operations', () => {
    const tx1 = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(2)]))
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'Shepherd' ,[new JigArg(0)]))
      .add(new LockInstruction(1, userPub))

    const tx2 = new Transaction()
      .add(new NewInstruction('aldea/sheep-counter.wasm', 'SheepCounter' ,[]))
      .add(new LoadInstruction(locationF(tx1, 1)))
      .add(new UnlockInstruction(1, userPub))
      .add(new CallInstruction(0, 'countShepherd', [ new JigArg(1) ]))
      .add(new LockInstruction(0, userPub))
      .add(new LockInstruction(1, userPub))

    const vm = new VM(storage)
    const exec1 = vm.execTx(tx1)
    storage.persist(exec1)
    const exec2 = vm.execTx(tx2)
    const parsed = exec2.outputs[0].parsedState()

    expect(parsed[0]).to.eql(2)
    expect(parsed[1]).to.eql(10)
  })

  it('checks the permision on nested operations and works when invalid', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/tv.wasm', 'TV' ,[]))
      .add(new NewInstruction('aldea/remote-control.wasm', 'RemoteControl' ,[new JigArg(0)]))
      .add(new NewInstruction('aldea/remote-control.wasm', 'TVUser' ,[new JigArg(1)]))
      .add(new CallInstruction(2, 'watchTvFromCouch' ,[new JigArg(2)]))
      .add(new LockInstruction(2, userPub))

    const vm = new VM(storage)
    vm.execTx(tx)
    expect(() => vm.execTx(tx)).not.to.throw()
  })

  it('checks the permision on nested operations and fails when invalid', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/tv.wasm', 'TV' ,[]))
      .add(new NewInstruction('aldea/remote-control.wasm', 'RemoteControl' ,[new JigArg(0)]))
      .add(new NewInstruction('aldea/remote-control.wasm', 'TVUser' ,[new JigArg(1)]))
      .add(new CallInstruction(2, 'watchTvFromTheFloor' ,[new JigArg(2)]))
      .add(new LockInstruction(2, userPub))

    const vm = new VM(storage)
    expect(() => vm.execTx(tx)).to.throw()
  })


  it('a tx can be signed', () => {
    const tx = new Transaction()
      .add(new NewInstruction('aldea/flock.wasm', 'Flock' ,[new LiteralArg(2)]))
      .add(new CallInstruction(0, 'grow' ,[new JigArg(1)]))
      .add(new LockInstruction(0, userPub))

    const sig = Signature.from(userPriv, Buffer.from(tx.serialize()))
    tx.addSignature(sig)

    const vm = new VM(storage)
    vm.execTx(tx)

    expect(tx.isCorrectlySigned()).to.eql(true)
  })
})
