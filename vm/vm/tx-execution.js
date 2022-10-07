import { JigLock } from "./locks/jig-lock.js"
import { JigRef } from "./jig-ref.js"
import { ExecutionError, PermissionError } from "./errors.js"
import { UserLock } from "./locks/user-lock.js"
import { NoLock } from "./locks/no-lock.js"
import { locationF } from "./location.js"
import { JigState } from "./jig-state.js"

class TxExecution {
  constructor (tx, vm) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.wasms = new Map()
    this.keys = []
    this.stack = []
    this.outputs = []
  }

  finalize () {
    this.jigs.forEach(jigRef => {
      if (jigRef.lock.isOpen()) {
        throw new PermissionError(`unlocked jig: ${jigRef.origin}`)
      }
    })

    this.jigs.forEach((jigRef, index) => {
      const location = locationF(this.tx, index)
      const origin = jigRef.origin || location
      const serialized = jigRef.module.instanceCall(jigRef.ref, jigRef.className, 'serialize')
      const jigState = new JigState(origin, location, jigRef.className, serialized, jigRef.module.id, jigRef.lock.serialize())
      this.outputs.push(jigState)
    })
  }

  loadModule (moduleId) {
    const existing = this.getWasmInstance(moduleId)
    if (existing) { return existing }
    const wasmModule = this.vm.createWasmInstance(moduleId)
    wasmModule.onMethodCall(this._onMethodCall.bind(this))
    wasmModule.onCreate(this._onCreate.bind(this))
    wasmModule.onAdopt(this._onAdopt.bind(this))
    wasmModule.onRelease(this._onRelease.bind(this))
    this.wasms.set(moduleId, wasmModule)
    return wasmModule
  }

  _onMethodCall (origin, methodName, args) {
    let jig = this.jigs.find(j => j.origin === origin)
    if (!jig) {
      this.loadJig(origin)
      jig = this.jigs.find(j => j.origin === origin)
    }

    return jig.module.rawInstanceCall(jig.ref, jig.className, methodName, args)
  }

  _onCreate (moduleId, className, args) {
    this.loadModule(moduleId)
    return this.instantiate(moduleId, className, args, null)
  }

  _onAdopt(childOrigin) {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    const parentJigOrigin = this.stack[this.stack.length - 1]
    childJigRef.setOwner(new JigLock(parentJigOrigin))
  }

  _onRelease(childOrigin, parentPointer) {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    const parentJigRef = this.jigs.find(jigR => jigR.ref.value === parentPointer.value)
    if (childJigRef.lock.checkCaller(parentJigRef.origin)) {
      childJigRef.setOwner(new NoLock())
    } else {
      throw new PermissionError(`${parentJigRef.origin} does not have permission to release ${childJigRef.origin}`)
    }
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

  loadJig (location, force) {
    const jigState = this.vm.findJigState(location)
    if (force === true && location !== jigState.location) {
      throw new ExecutionError('jig already spent')
    }
    const module = this.loadModule(jigState.moduleId)
    const ref = module.hidrate(jigState.className, jigState.stateBuf)
    const lock = this._hidrateLock(jigState.lock)
    const jigRef = new JigRef(ref, jigState.className, module, jigState.origin, lock)
    this.addNewJigRef(jigRef)
    return jigRef
  }

  _hidrateLock (frozenLock) {
    if (frozenLock.type === 'UserLock') {
      return new UserLock(frozenLock.data.pubkey)
    } else if (frozenLock.type === 'JigLock') {
      return new JigLock(frozenLock.data.origin)
    } else {
      throw new Error('unknown lock type')
    }
  }

  lockJig (masterListIndex, lock) {
    const jigRef = this.getJigRef(masterListIndex)
    if (!jigRef.lock.checkCaller()) {
      throw new ExecutionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(lock)
  }

  instantiate (moduleId, className, args, initialLock) {
    const module = this.loadModule(moduleId)
    const newOrigin = this.newOrigin()
    const jigRef = new JigRef(null, className, module, newOrigin, initialLock)
    this.addNewJigRef(jigRef)
    this.stack.push(newOrigin)
    jigRef.ref = module.staticCall(className,'constructor', args)
    this.stack.pop()
    return jigRef
  }

  call (masterListIndex, methodName, args, caller) {
    const jigRef = this.getJigRef(masterListIndex)
    this.stack.push(jigRef.origin)
    jigRef.sendMessage(methodName, args, caller)
    this.stack.pop()
  }

  newOrigin () {
    return locationF(this.tx, this.jigs.length)
  }
}

export { TxExecution }
