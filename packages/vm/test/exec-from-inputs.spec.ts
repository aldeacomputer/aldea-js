import {Clock, Storage, StubClock, VM} from "../src/index.js";
import {Output, Tx, Lock, Pointer, PrivKey, BCS, ed25519} from "@aldea/core";
import {buildVm} from "./util.js";
import {TxExecution} from "../src/tx-execution.js";
import {ExtendedTx} from "../src/index.js";
import {ExTxExecContext} from "../src/tx-context/ex-tx-exec-context.js";
import {expect} from "chai";
import {WasmContainer} from "../src/wasm-container.js";
import {JigState} from "../src/jig-state.js";
import { Abi } from "@aldea/core/abi";
import {
  CallInstruction,
  ImportInstruction,
  NewInstruction,
  SignInstruction,
  FundInstruction,
  LoadInstruction,
  LockInstruction,
} from "@aldea/core/instructions";

const outputFromJigState = (jig: JigState): Output => {
  return new Output(
    jig.origin,
    jig.currentLocation,
    new Pointer(jig.packageId, jig.classIdx),
    new Lock(jig.lockType(), jig.lockData()),
    jig.stateBuf
  )
}


describe('exec from inputs', () => {
  let vm: VM
  let storage: Storage
  const userPriv = PrivKey.fromRandom()
  const userPub = userPriv.toPubKey()
  const userAddr = userPub.toAddress()

  let abiFor: (key: string) => Abi
  let abiForCoin: () => Abi
  let modIdFor: (k: string) => Uint8Array

  let clock: Clock
  beforeEach(() => {
    const data = buildVm(['flock'])
    vm = data.vm
    clock = data.clock
    storage = data.storage
    modIdFor = data.modIdFor
    abiFor = (key: string) => storage.getModule(modIdFor(key)).abi
    abiForCoin = () => storage.getModule(Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')).abi
  })


  it('can execute a tx that depends only on a output id input', () => {
    const coin = vm.mint(userAddr, 1000)
    const tx = new Tx()
    tx.push(new SignInstruction(new Uint8Array(), userPub.toBytes()))
    ;(<SignInstruction>tx.instructions[0]).sig = ed25519.sign(tx.sighash(), userPriv)
    const extx = new ExtendedTx(tx, [outputFromJigState(coin)]);
    const context = new ExTxExecContext(extx, clock, storage, vm)
    const exec = new TxExecution(context)

    const jigRef = exec.load(coin.id()).asJig()
    const newCoinStmt = exec.callInstanceMethod(jigRef, 'send', [200])
    exec.fundByIndex(newCoinStmt.idx)
    const result = exec.finalize()

    expect(result.outputs).to.have.length(2)
  })


  it('can execute from a totally local environment', async () => {
    let coin = vm.mint(userAddr, 500)

    //console.dir(abiForCoin(), { depth: 5 })

    // first get some state from the global chain.
    const tx = new Tx()
    tx.push(new ImportInstruction(modIdFor('flock')))
    tx.push(new NewInstruction(0, 0, new Uint8Array([])))
    tx.push(new CallInstruction(1, 1, new Uint8Array([])))
    tx.push(new LoadInstruction(coin.id()))
    tx.push(new CallInstruction(3, 1, new BCS(abiForCoin()).encode('Coin$send', [300])))
    tx.push(new FundInstruction(3))
    tx.push(new LockInstruction(1, userAddr.hash))
    tx.push(new LockInstruction(4, userAddr.hash))
    tx.push(new SignInstruction(new Uint8Array(), userPub.toBytes()))
    ;(<SignInstruction>tx.instructions[8]).sig = ed25519.sign(tx.sighash(), userPriv)
    const tx1Exec = await vm.execTx(tx)

    // now exec with no context other than the package code
    const justFlockAndCoinPkg = {
      wasmForPackageId(moduleId: Uint8Array): WasmContainer {
        if (Buffer.compare(moduleId, modIdFor('flock'))) {
          return storage.wasmForPackageId(moduleId)
        } else if ( Buffer.compare(moduleId, new Uint8Array(Buffer.alloc(32).fill(0))) ) {
          return storage.wasmForPackageId(moduleId)
        } else {
          throw new Error('should not request for any other package')
        }
      }
    }

    const vm2 = new VM(new Storage(), justFlockAndCoinPkg, new StubClock(), () => expect.fail('should not try to compile') )
    const tx2 = new Tx()
    tx2.push(new LoadInstruction(tx1Exec.outputs[0].id())) // flock
    tx2.push(new LoadInstruction(tx1Exec.outputs[2].id())) // coin
    tx2.push(new CallInstruction(0, 1, new Uint8Array([]))) // call "grow" over the flock
    tx2.push(new FundInstruction(1))
    tx2.push(new SignInstruction(new Uint8Array(), userPub.toBytes()))
    ;(<SignInstruction>tx2.instructions[4]).sig = ed25519.sign(tx.sighash(), userPriv)

    const exTx = new ExtendedTx(tx2, tx1Exec.outputs.map(outputFromJigState))
    const tx2Exec = await vm2.execTxFromInputs(exTx)

    expect(tx2Exec.outputs).to.have.length(2)
    expect(tx2Exec.outputs[0].parsedState(abiFor('flock'))).to.eql([2])
  })
})
