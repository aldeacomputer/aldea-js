import {Clock, VM} from "../src/index.js";
import {AldeaCrypto} from "../src/aldea-crypto.js";
import {Tx} from "@aldea/sdk-js";
import {buildVm, emptyExecFactoryFactory} from "./util.js";
import {TxExecution} from "../src/tx-execution.js";
import {ExtendedTx} from "../src/tx-context/extended-tx.js";
import {ExTxExecContext} from "../src/tx-context/ex-tx-exec-context.js";
import {expect} from "chai";
import {SignInstruction} from "@aldea/sdk-js/instructions/index";

describe('exec from inputs', () => {
  let vm: VM
  const userPriv = AldeaCrypto.randomPrivateKey()
  const userPub = AldeaCrypto.publicKeyFromPrivateKey(userPriv)
  const userAddr = userPub.toAddress()
  const moduleIds = new Map<string, string>()

  let clock: Clock
  beforeEach(() => {
    const data = buildVm(['flock'])
    vm = data.vm
    clock = data.clock
  })

  const emptyExec = emptyExecFactoryFactory(() => vm['storage'], () => vm)

  let exec: TxExecution
  beforeEach(() => {
    exec = emptyExec()
  })


  it('can execute a tx that depends only on a output id input', () => {
    const coin = vm.mint(userAddr, 1000)
    const tx = new Tx()
    tx.push(new SignInstruction(tx.createSignature(userPriv), userPub.toBytes()))
    const extx = new ExtendedTx(tx, [coin]);
    const context = new ExTxExecContext(extx, clock, vm, vm)
    const exec = new TxExecution(context)

    const jigRef = exec.loadJigByOutputId(coin.id()).asJig()
    const newCoinStmt = exec.callInstanceMethod(jigRef, 'send', [200])
    exec.fundByIndex(newCoinStmt.idx)
    const result = exec.finalize()

    expect(result.outputs).to.have.length(2)
  })

})
