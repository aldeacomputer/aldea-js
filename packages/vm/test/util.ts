import {Storage, StubClock, VM} from "../src/index.js";
import {base16, instructions, PrivKey, Tx} from "@aldea/sdk-js";
import {TxExecution} from "../src/tx-execution.js";
import {StorageTxContext} from "../src/tx-context/storage-tx-context.js";
import fs from "fs";
import {fileURLToPath} from "url";
import {compile} from "@aldea/compiler";
import {Abi} from "@aldea/compiler/abi";

const __dir = fileURLToPath(new URL('.', import.meta.url));


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

export function addPreCompiled (vm: VM, src: string ): Uint8Array {
  return vm.addPreCompiled(
    fs.readFileSync(`${__dir}../build/aldea/${src}.wasm`),
    fs.readFileSync(`${__dir}../assembly/aldea/${src}.ts`).toString(),
    new Uint8Array(fs.readFileSync(`${__dir}../build/aldea/${src}.abi.cbor`)),
    fs.readFileSync(`${__dir}../build/aldea/${src}.docs.json`)
  )
}

export function buildVm(sources: string[]) {
  const moduleIds = new Map<string, string>()
  const abis = new Map<string, Abi>
  const clock = new StubClock()
  const storage = new Storage()
  const vm = new VM(storage, storage, clock, compile)


  sources.forEach(src => {
    const id = addPreCompiled(vm, src)
    const module = storage.getModule(id)
    moduleIds.set(src, base16.encode(id))
    abis.set(src, module.abi)
  })

  return {
    modIdFor: (modId: string): Uint8Array => {
      const ret = moduleIds.get(modId)
      if (!ret) {
        throw new Error(`unknown module: ${modId}`)
      }
      return base16.decode(ret)
    },
    abiFor(modId: string): Abi {
      const ret = abis.get(modId)
      if (!ret) {
        throw new Error(`unknown module: ${modId}`)
      }
      return ret
    },
    clock,
    storage,
    vm
  }
}
