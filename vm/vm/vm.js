import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import { JigState } from './jig-state.js'
import { PermissionError } from "./errors.js"
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
    currentExecution.jigs.forEach(jigRef => {
      if (jigRef.lock.isOpen()) {
        throw new PermissionError(`unlocked jig: ${jigRef.origin}`)
      }
    })
    currentExecution.jigs.forEach((jigRef, index) => {
      const location = `${tx.id}_${index}`
      const origin = jigRef.origin || location
      const serialized = jigRef.module.instanceCall(jigRef.ref, 'serialize')
      const jig = new JigState(origin, location, serialized, jigRef.module.id, jigRef.lock.serialize())
      this.storage.addJig(jig)
    })
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
