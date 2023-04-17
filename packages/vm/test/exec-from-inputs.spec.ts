import {Clock, Storage, StubClock, VM} from "../src/index.js";
import {AldeaCrypto} from "../src/aldea-crypto.js";
import {instructions, Output, Tx, Lock, Pointer} from "@aldea/sdk-js";
import {buildVm} from "./util.js";
import {TxExecution} from "../src/tx-execution.js";
import {ExtendedTx} from "../src/tx-context/extended-tx.js";
import {ExTxExecContext} from "../src/tx-context/ex-tx-exec-context.js";
import {expect} from "chai";
import {LockInstruction} from "@aldea/sdk-js/instructions/index";
import {WasmInstance} from "../src/wasm-instance.js";
import {JigState} from "../src/jig-state.js";
const {
  CallInstruction,
  ImportInstruction,
  NewInstruction,
  SignInstruction,
  FundInstruction,
  LoadInstruction
} = instructions

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
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()

  let modIdFor: (k: string) => Uint8Array

  let clock: Clock
  beforeEach(() => {
    const data = buildVm(['flock'])
    vm = data.vm
    clock = data.clock
    storage = data.storage
    modIdFor = data.modIdFor
  })

  // const emptyExec = emptyExecFactoryFactory(() => vm['storage'], () => vm)


  it('can execute a tx that depends only on a output id input', () => {
    const coin = vm.mint(userAddr, 1000)
    const tx = new Tx()
    tx.push(new SignInstruction(tx.createSignature(userPriv), userPub.toBytes()))
    const extx = new ExtendedTx(tx, [outputFromJigState(coin)]);
    const context = new ExTxExecContext(extx, clock, storage, vm)
    const exec = new TxExecution(context)

    const jigRef = exec.loadJigByOutputId(coin.id()).asJig()
    const newCoinStmt = exec.callInstanceMethod(jigRef, 'send', [200])
    exec.fundByIndex(newCoinStmt.idx)
    const result = exec.finalize()

    expect(result.outputs).to.have.length(2)
  })


  it('can execute from a totally local environment', async () => {
    let coin = vm.mint(userAddr, 500)

    // first get some state from the global chain.
    const tx = new Tx()
    tx.push(new ImportInstruction(modIdFor('flock')))
    tx.push(new NewInstruction(0, 0, []))
    tx.push(new CallInstruction(1, 1, []))
    tx.push(new LoadInstruction(coin.id()))
    tx.push(new CallInstruction(3, 1, [300]))
    tx.push(new FundInstruction(3))
    tx.push(new LockInstruction(1, userAddr.hash))
    tx.push(new LockInstruction(4, userAddr.hash))
    tx.push(new SignInstruction(tx.createSignature(userPriv), userPub.toBytes()))
    const tx1Exec = await vm.execTx(tx)

    // now exec with no context other than the package code
    const justFlockAndCoinPkg = {
      wasmForPackageId(moduleId: Uint8Array): WasmInstance {
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
    tx2.push(new CallInstruction(0, 1, [])) // call "grow" over the flock
    tx2.push(new FundInstruction(1))
    tx2.push(new SignInstruction(tx2.createSignature(userPriv), userPub.toBytes()))

    const exTx = new ExtendedTx(tx2, tx1Exec.outputs.map(outputFromJigState))
    const tx2Exec = await vm2.execTxFromInputs(exTx)

    expect(tx2Exec.outputs).to.have.length(2)
    expect(tx2Exec.outputs[0].parsedState()).to.eql([2])
  })
})
