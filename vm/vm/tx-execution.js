import { JigLock } from "./locks/jig-lock.js"
import { JigRef } from "./jig-ref.js"

class TxExecution {
  constructor (tx, vm) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.wasms = new Map()
    this.keys = []
    this.stack = []
  }

  loadModule (moduleId) {
    const existing = this.getWasmInstance(moduleId)
    if (existing) { return existing }
    const wasmModule = this.vm.createWasmInstance(moduleId)
    wasmModule.onMethodCall(this._onMethodCall.bind(this))
    wasmModule.onCreate(this._onCreate.bind(this))
    wasmModule.onAdopt(this._onAdopt.bind(this))
    this.wasms.set(moduleId, wasmModule)
    return wasmModule
  }

  _onMethodCall (origin, methodName, args) {
    let jig = this.jigs.find(j => j.origin === origin)
    if (!jig) {
      this.vm.loadJig(origin)
      jig = this.jigs.find(j => j.origin === origin)
    }

    return jig.module.rawInstanceCall(jig.ref, methodName, args)
  }

  _onCreate (moduleId, args) {
    this.loadModule(moduleId)
    return this.instanciate(moduleId, args, null)
  }

  _onAdopt(childOrigin) {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    const parentJigOrigin = this.stack[this.stack.length - 1]
    childJigRef.setOwner(new JigLock(parentJigOrigin))
  }

  getWasmInstance (moduleName) {
    return this.wasms.get(moduleName)
  }

  getJigRef (index) {
    return this.jigs[index]
  }

  getJigRefByOrigin (origin) {
    return this.jigs.find(jr => jr.origin === origin)
  }

  addInputJig (jigRef) {
    return this.addNewJigRef(jigRef)
  }

  addNewJigRef (jigRef) {
    this.jigs.push(jigRef)
    return jigRef
  }

  addKey (key) {
    this.keys = key
  }

  run () {
    this.tx.exec(this)
  }

  loadJig (location) {
    const jigState = this.vm.findJigState(location)
    const module = this.loadModule(jigState.moduleId)
    const ref = module.hidrate(jigState.stateBuf)
    this.addNewJigRef(new JigRef(ref, module, jigState.origin, jigState.lock))
  }

  lockJig (jigIndex, lock) {
    const jigRef = this.getJigRef(jigIndex)
    jigRef.close(lock)
  }

  instanciate (moduleId, args, initialLock) {
    const module = this.loadModule(moduleId)
    const newOrigin = this.newOrigin()
    const jigRef = new JigRef(null, module, newOrigin, initialLock)
    this.addNewJigRef(jigRef)
    this.stack.push(newOrigin)
    jigRef.ref = module.staticCall('constructor', args)
    this.stack.pop()
    return jigRef
  }

  call (masterListIndex, methodName, args, caller) {
    const jigRef = this.getJigRef(masterListIndex)
    return jigRef.sendMessage(methodName, args, caller)
  }

  newOrigin () {
    return `${this.tx.id}_${this.jigs.length}`
  }
}

export { TxExecution }
