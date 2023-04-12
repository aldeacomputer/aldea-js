import {Storage, VM} from "../src/index.js";
import {instructions, PrivKey, Tx} from "@aldea/sdk-js";
import {TxExecution} from "../src/tx-execution.js";
import {StorageTxContext} from "../src/tx-context/storage-tx-context.js";

export const emptyExecFactoryFactory = (lazyStorage: () => Storage, lazyVm: () => VM) => (privKeys: PrivKey[] = []) => {
  const storage = lazyStorage()
  const vm = lazyVm()
  const tx = new Tx()
  privKeys.forEach(pk => {
    const sig = tx.createSignature(pk)
    tx.push(new instructions.SignInstruction(sig, pk.toPubKey().toBytes()))
  })
  const context = new StorageTxContext(tx, storage, vm, vm.clock)
  const exec = new TxExecution(context)
    exec.markAsFunded()
  return exec
}
