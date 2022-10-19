import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"
import {Storage} from "./storage.js";
import {TransactionWrap} from "./transactionWrap.js";
import { abiFromJson } from '@aldea/compiler/abi'

const __dir = fileURLToPath(import.meta.url)

type ModuleData = {
  mod: WebAssembly.Module,
  abi: any
}

export class VM {
  private storage: Storage;
  private modules: Map<string, ModuleData>;

  constructor (storage: Storage) {
    this.storage = storage
    this.modules = new Map<string, ModuleData>()
  }

  execTx (tx: TransactionWrap): TxExecution {
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
}
