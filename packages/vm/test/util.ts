import {Storage, VM} from "../src/index.js";
import {base16, BCS, Output, PrivKey} from "@aldea/core";
import {TxExecution} from "../src/tx-execution.js";
import {StorageTxContext} from "../src/tx-context/storage-tx-context.js";
import fs from "fs";
import {fileURLToPath} from "url";
import {compile} from "@aldea/compiler";
import {randomBytes} from "@aldea/core/support/util";
import {Abi, AbiQuery} from "@aldea/core/abi";
import {AbiAccess} from "../src/memory/abi-helpers/abi-access.js";
import {expect} from "chai";
import {ExecOpts} from "../src/export-opts.js";

const __dir = fileURLToPath(new URL('.', import.meta.url));

export const fundedExecFactoryFactory = (lazyStorage: () => Storage, lazyVm: () => VM) => (privKeys: PrivKey[] = [], opts: ExecOpts = ExecOpts.default()) => {
  const storage = lazyStorage()
  const vm = lazyVm()
  const txHash = randomBytes(32)

  const coinPriv = PrivKey.fromRandom()
  const pubKeys = [coinPriv, ...privKeys].map(p => p.toPubKey())

  const context = new StorageTxContext(txHash, pubKeys, storage, vm)
  const exec = new TxExecution(context, opts)
  const output = vm.mint(pubKeys[0].toAddress(), 100, new Uint8Array(32).fill(1))

  const stmt =  exec.load(output.hash)
  exec.fund(stmt.idx)
  return { exec, txHash }
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
  const storage = new Storage()
  const vm = new VM(storage, compile)

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
    storage,
    vm
  }
}

export type CallData = [
  number,
  Uint8Array
]
export class ArgsBuilder {
  private readonly abi: Abi;
  constructor (abi: Abi) {
    this.abi = abi
  }

  method(className: string, methodName: string, args: any[]): CallData {
    const abiAccess = new AbiAccess(this.abi)

    const cls = abiAccess.exportedByName(className).get().toAbiClass()
    const method = cls.methodByName(methodName).get()
    const bcs = new BCS(this.abi)
    return [
      method.idx,
      bcs.encode(`${className}_${methodName}`, args)
    ]
  }

  constr(className: string, args: any[]): CallData {
    const abiAccess = new AbiAccess(this.abi)
    const abiClass = abiAccess.exportedByName(className).get().toAbiClass()

    const bcs = new BCS(this.abi)

    return [
      abiClass.idx,
      bcs.encode(`${className}_constructor`, args)
    ]
  }

  exec(fnName: string, args: any[]): CallData {
    const bcs = new BCS(this.abi)
    const query = new AbiQuery(this.abi)
    const idx = query.fromExports().allCode().findIndex(c => c.name === fnName)

    return [idx, bcs.encode(fnName, args)]
  }
}

export function parseOutput (o: Output): { [key: string]: any } {
  const props = o.props
  if (!props) {
    expect.fail('no output')
  }
  return props
}
