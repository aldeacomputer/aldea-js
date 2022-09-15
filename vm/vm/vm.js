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
    this.currentExecution = new TxExecution(tx, this)
    tx.exec(this)
    this.currentExecution.jigs.forEach(jigRef => {
      if (jigRef.owner === null) {
        throw new PermissionError(`unlocked jig: ${jigRef.origin}`)
      }
    })
    this.currentExecution.jigs.forEach((jigRef, index) => {
      const location = `${tx.id}_${index}`
      const origin = jigRef.origin || location
      const serialized = jigRef.module.instanceCall(jigRef.ref, 'serialize')
      const jig = new JigState(origin, location, serialized, jigRef.module.id)
      this.storage.addJig(jig)
    })

    this.currentExecution = null
  }

  load (relativePath) {
    if (this.currentExecution.getWasmInstance(relativePath)) {
      return
    }
    const modulePath = path.join(__dir, '../../build', relativePath)
    const wasmModule = WasmModule.fromFilePath(modulePath, relativePath)
    this.currentExecution.addWasmInstance(
      relativePath,
      wasmModule
    )
    return wasmModule
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
    const jigPointer = module.staticCall('constructor', ...args)
    jigRef.ref = jigPointer
    this.currentExecution.stack.pop()
    return jigRef
  }

  loadJig (location) {
    const frozenJig = this.storage.getJigState(location)
    this.load(frozenJig.moduleId)
    const module = this.currentExecution.getWasmInstance(frozenJig.moduleId)
    const ref = module.hidrate(frozenJig.stateBuf)
    this.currentExecution.addInputJig(new JigRef(ref, module, frozenJig.origin))
  }

  addKey (key) {
    this.currentExecution.addKey(key)
  }

  lockJig (jigIndex, lock) {
    const jigRef = this.currentExecution.getJigRef(jigIndex)
    jigRef.close(lock)
  }
}
