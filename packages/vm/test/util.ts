import {Storage, StubClock, VM} from "../src/index.js";
import {base16, PrivKey, Tx, ed25519} from "@aldea/core";
import {SignInstruction} from "@aldea/core/instructions";
import {TxExecution} from "../src/tx-execution.js";
import {StorageTxContext} from "../src/tx-context/storage-tx-context.js";
import fs from "fs";
import {fileURLToPath} from "url";
import {compile} from "@aldea/compiler";

const __dir = fileURLToPath(new URL('.', import.meta.url));


export const emptyExecFactoryFactory = (lazyStorage: () => Storage, lazyVm: () => VM) => (privKeys: PrivKey[] = []) => {
  const storage = lazyStorage()
  const vm = lazyVm()
  const tx = new Tx()
  for (let i = 0; i < privKeys.length; i++) {
    tx.push(new SignInstruction(new Uint8Array(), privKeys[i].toPubKey().toBytes()))
  }
  for (let i = 0; i < privKeys.length; i++) {
    (<SignInstruction>tx.instructions[i]).sig = ed25519.sign(tx.sighash(), privKeys[i])
  }
  const context = new StorageTxContext(tx, storage, vm, vm.clock)
  const exec = new TxExecution(context)
    exec.markAsFunded()
  return exec
}

export function addPreCompiled (vm: VM, src: string ): Uint8Array {
  return vm.addPreCompiled(
    fs.readFileSync(`${__dir}../build/aldea/${src}.wasm`),
    fs.readFileSync(`${__dir}../assembly/aldea/${src}.ts`).toString(),
    new Uint8Array(fs.readFileSync(`${__dir}../build/aldea/${src}.abi.bin`)),
    fs.readFileSync(`${__dir}../build/aldea/${src}.docs.json`)
  )
}

export function buildVm(sources: string[]) {
  const moduleIds = new Map<string, string>()
  const clock = new StubClock()
  const storage = new Storage()
  const vm = new VM(storage, storage, clock, compile)

  sources.forEach(src => {
    const id = addPreCompiled(vm, src)
    moduleIds.set(src, base16.encode(id))
  })

  return {
    modIdFor: (modId: string): Uint8Array => {
      const ret = moduleIds.get(modId)
      if (!ret) {
        throw new Error(`unknown module: ${modId}`)
      }
      return base16.decode(ret)
    },
    clock,
    storage,
    vm
  }
}
