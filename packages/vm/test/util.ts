import {Storage, StubClock, VM} from "../src/index.js";
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

const __dir = fileURLToPath(new URL('.', import.meta.url));


export const emptyExecFactoryFactory = (lazyStorage: () => Storage, lazyVm: () => VM) => (privKeys: PrivKey[] = []) => {
  const storage = lazyStorage()
  const vm = lazyVm()
  const txHash = randomBytes(32)

  const coinPriv = PrivKey.fromRandom()
  const pubKeys = [coinPriv, ...privKeys].map(p => p.toPubKey())

  const context = new StorageTxContext(txHash, pubKeys, storage, vm)
  const exec = new TxExecution(context)
  const output = vm.mint(pubKeys[0].toAddress(), 100, new Uint8Array(34).fill(1))

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
  const clock = new StubClock()
  const storage = new Storage()
  const vm = new VM(storage, clock, compile)

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

export type CallData = [
  number,
  Uint8Array
]
export class ArgsBuilder {
  private pkgName: string;
  private abiFor: (key: string) => Abi;
  constructor (pkgName: string, abiFor: (key: string) => Abi) {
    this.pkgName = pkgName
    this.abiFor = abiFor
  }

  method(className: string, methodName: string, args: any[]): CallData {
    const abi = this.abiFor(this.pkgName)
    const abiAccess = new AbiAccess(abi)

    const cls = abiAccess.exportedByName(className).get().toAbiClass()
    const method = cls.methodByName(methodName).get()
    const bcs = new BCS(abi)
    return [
      method.idx,
      bcs.encode(`${className}_${methodName}`, args)
    ]
  }

  constr(className: string, args: any[]): CallData {
    const abi = this.abiFor(this.pkgName)
    const abiAccess = new AbiAccess(abi)
    const abiClass = abiAccess.exportedByName(className).get().toAbiClass()

    const bcs = new BCS(abi)

    return [
      abiClass.idx,
      bcs.encode(`${className}_constructor`, args)
    ]
  }

  exec(fnName: string, args: any[]): CallData {
    const abi = this.abiFor(this.pkgName);
    const bcs = new BCS(abi)
    const query = new AbiQuery(abi)
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
