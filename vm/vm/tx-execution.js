import { JigLock } from "./locks/jig-lock.js"

class TxExecution {
  constructor (tx, vm) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.newJigs = []
    this.inputJigs = []
    this.wasms = new Map()
    this.keys = []
    this.stack = []
  }

  async exec (vm) {
    for (const instruction of this.instructions) {
      await instruction.exec(vm)
    }
  }

  addWasmInstance (moduleName, wasmModule) {
    wasmModule.onMethodCall(this._onMethodCall.bind(this))
    wasmModule.onCreate(this._onCreate.bind(this))
    wasmModule.onAdopt(this._onAdopt.bind(this))
    this.wasms.set(moduleName, wasmModule)
  }

  _onMethodCall (origin, methodName, args) {
    let jig = this.jigs.find(j => j.origin === origin)
    if (!jig) {
      this.vm.loadJig(origin)
      jig = this.jigs.find(j => j.origin === origin)
    }

    return jig.module.rawInstanceCall(jig.ref, methodName, args)
  }

  _onCreate (moduleName, args) {
    this.vm.load(moduleName)
    return this.vm.instanciate(moduleName, args, null)
  }

  _onAdopt(childOrigin) {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    const parentJigOrigin = this.stack[this.stack.length - 1]
    childJigRef.setOwner(new JigLock(parentJigOrigin))
  }

  getWasmInstance (moduleName) {
    return this.wasms.get(moduleName)
  }

  addNewJigRef (jigRef) {
    this.jigs.push(jigRef)
    this.newJigs.push(jigRef)
    return jigRef
  }

  getJigRef (index) {
    return this.jigs[index]
  }

  getJigRefByOrigin (origin) {
    return this.jigs.find(jr => jr.origin === origin)
  }

  addInputJig (jigRef) {
    this.inputJigs.push(jigRef)
    this.jigs.push(jigRef)
  }

  addKey (key) {
    this.keys = key
  }
}

export { TxExecution }
