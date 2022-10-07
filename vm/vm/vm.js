import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"

const __dir = fileURLToPath(import.meta.url)

export class VM {
  constructor (storage) {
    this.storage = storage
    this.currentExecution = null
    this.modules = new Map()
  }

  execTx (tx) {
    const currentExecution = new TxExecution(tx, this)
    currentExecution.run()
    currentExecution.finalize()
    return currentExecution
  }

  createWasmInstance (relativePath) {
    const existingModule = this.modules.get(relativePath)
    if (existingModule) { return new WasmInstance(existingModule, relativePath) }

    const modulePath = path.join(__dir, '../../build', relativePath)
    const wasmBuffer = fs.readFileSync(modulePath)
    const module = new WebAssembly.Module(wasmBuffer)
    this.modules.set(relativePath, module)
    return new WasmInstance(module, relativePath)
  }


  findJigState (location) {
    return this.storage.getJigState(location)
  }

  addKey (key) {
    this.currentExecution.addKey(key)
  }
}
