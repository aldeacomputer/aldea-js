import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"
import {Storage} from "./storage.js";
import {Transaction} from "./transaction.js";
import {Abi, abiFromCbor, abiFromJson} from '@aldea/compiler/abi'
import {compile} from '@aldea/compiler'
import {blake3} from "@aldea/sdk-js/support/hash";

const __dir = fileURLToPath(import.meta.url)

type ModuleData = {
  mod: WebAssembly.Module,
  abi: Abi
}

export class VM {
  private storage: Storage;
  private modules: Map<string, ModuleData>;

  constructor (storage: Storage) {
    this.storage = storage
    this.modules = new Map<string, ModuleData>()
  }

  execTx (tx: Transaction): TxExecution {
    const currentExecution = new TxExecution(tx, this)
    currentExecution.run()
    currentExecution.finalize()
    return currentExecution
  }

  createWasmInstance (relativePath: string) {
    const existingModule = this.modules.get(relativePath)
    if (existingModule) {
      return new WasmInstance(existingModule.mod, existingModule.abi, relativePath)
    }

    const modulePath = path.join(__dir, '../../build', relativePath)
    const wasmBuffer = fs.readFileSync(modulePath)
    const module = new WebAssembly.Module(wasmBuffer)
    const abiPath = modulePath.replace('wasm', 'abi.json')
    const abi = abiFromJson(fs.readFileSync(abiPath).toString())
    this.modules.set(relativePath, { mod: module, abi })
    return new WasmInstance(module, abi, relativePath)
  }


  findJigState (location: string) {
    return this.storage.getJigState(location)
  }

  async deployCode (sourceCode: string): Promise<string> {
    const result = await compile(sourceCode)
    const id = Buffer.from(blake3(result.output.wasm)).toString('hex')
    this.modules.set(id, { mod: new WebAssembly.Module(result.output.wasm), abi: abiFromCbor(result.output.abi.buffer) })
    return id
  }

  addPreCompiled (relativePath: string): string {
    const modulePath = path.join(__dir, '../../build', relativePath)
    const wasmBuffer = fs.readFileSync(modulePath)
    const id = Buffer.from(blake3(wasmBuffer)).toString('hex')
    const module = new WebAssembly.Module(wasmBuffer)
    const abiPath = modulePath.replace('wasm', 'abi.json')
    const abi = abiFromJson(fs.readFileSync(abiPath).toString())
    this.modules.set(id, { mod: module, abi })
    return id
  }
}
