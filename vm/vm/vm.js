import path from 'path'
import { WasmModule } from './wasm-module.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import { JigState } from './jig-state.js'
import { JigRef } from './jig-ref.js'
import { PermissionError } from "./permission-error.js"

const __dir = fileURLToPath(import.meta.url)

export class VM {
  constructor (storage) {
    this.storage = storage
    this.currentExecution = null
  }

  execTx (tx) {
    const currentExecution = new TxExecution(tx, this)
    currentExecution.run()
    currentExecution.jigs.forEach(jigRef => {
      if (jigRef.lock === null) {
        throw new PermissionError(`unlocked jig: ${jigRef.origin}`)
      }
    })
    currentExecution.jigs.forEach((jigRef, index) => {
      const location = `${tx.id}_${index}`
      const origin = jigRef.origin || location
      const serialized = jigRef.module.instanceCall(jigRef.ref, 'serialize')
      const jig = new JigState(origin, location, serialized, jigRef.module.id, jigRef.lock)
      this.storage.addJig(jig)
    })
    return currentExecution
  }

  createWasmInstance (relativePath) {
    const modulePath = path.join(__dir, '../../build', relativePath)
    return WasmModule.fromFilePath(modulePath, relativePath)
  }

  call (instanceRef, methodName, args, caller) {
    const jigRef = this.currentExecution.getJigRef(instanceRef)
    return jigRef.sendMessage(methodName, args, caller)
  }

  instanciate (moduleRef, args, initialOwner) {
    const module = this.currentExecution.getWasmInstance(moduleRef)
    const origin = `${this.currentExecution.tx.id}_${this.currentExecution.jigs.length}`
    const jigRef = new JigRef(null, module, origin, initialOwner)
    this.currentExecution.addNewJigRef(jigRef)
    this.currentExecution.stack.push(origin)
    jigRef.ref = module.staticCall('constructor', ...args)
    this.currentExecution.stack.pop()
    return jigRef
  }

  findJigState (location) {
    return this.storage.getJigState(location)
  }

  addKey (key) {
    this.currentExecution.addKey(key)
  }
}
