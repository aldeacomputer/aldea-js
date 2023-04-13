import {Clock, Storage, VM} from "../src/index.js";
import {AldeaCrypto} from "../src/aldea-crypto.js";
import {Tx} from "@aldea/sdk-js";
import {buildVm} from "./util.js";
import {TxExecution} from "../src/tx-execution.js";
import {ExtendedTx} from "../src/tx-context/extended-tx.js";
import {ExTxExecContext} from "../src/tx-context/ex-tx-exec-context.js";
import {expect} from "chai";
import {SignInstruction} from "@aldea/sdk-js/instructions/index";

describe('exec from inputs', () => {
  let vm: VM
  let storage: Storage
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()

  let clock: Clock
  beforeEach(() => {
    const data = buildVm(['flock'])
    vm = data.vm
    clock = data.clock
    storage = data.storage
  })

  // const emptyExec = emptyExecFactoryFactory(() => vm['storage'], () => vm)


  it('can execute a tx that depends only on a output id input', () => {
    const coin = vm.mint(userAddr, 1000)
    const tx = new Tx()
    tx.push(new SignInstruction(tx.createSignature(userPriv), userPub.toBytes()))
    const extx = new ExtendedTx(tx, [coin]);
    const context = new ExTxExecContext(extx, clock, storage, vm)
    const exec = new TxExecution(context)

    const jigRef = exec.loadJigByOutputId(coin.id()).asJig()
    const newCoinStmt = exec.callInstanceMethod(jigRef, 'send', [200])
    exec.fundByIndex(newCoinStmt.idx)
    const result = exec.finalize()

    expect(result.outputs).to.have.length(2)
  })

})
