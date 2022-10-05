import { JigLock } from "./locks/jig-lock.js"
import {JigPointer, JigRef} from "./jig-ref.js"
import { ExecutionError, PermissionError } from "./errors.js"
import { UserLock } from "./locks/user-lock.js"
import { NoLock } from "./locks/no-lock.js"
import { locationF } from './location.js'
import { JigState } from "./jig-state.js"
import {Transaction} from "./transaction.js";
import {VM} from "./vm.js";
import {WasmInstance} from "./wasm-instance.js";
import {Lock} from "./locks/lock.js";

class TxExecution {
  tx: Transaction;
  private vm: VM;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private keys: Uint8Array[];
  private stack: string[];
  outputs: JigState[];

  constructor (tx: Transaction, vm: VM) {
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
      const serialized = jigRef.serialize() //  module.instanceCall(jigRef.ref, jigRef.className, 'serialize')
      const jigState = new JigState(origin, location, jigRef.className, serialized, jigRef.module.id, jigRef.lock.serialize())
      this.outputs.push(jigState)
    })
  }

  loadModule (moduleId: string) {
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

  _onMethodCall (origin: string, methodName: string, args: any[]): Uint8Array {
    let jig = this.jigs.find(j => j.origin === origin)
    if (!jig) {
      jig = this.loadJig(origin, false)
    }

    return jig.module.rawInstanceCall(jig.ref, jig.className, methodName, args)
  }

  _onCreate (moduleId: string, className: string, args: any[]): JigRef {
    this.loadModule(moduleId)
    return this.instantiate(moduleId, className, args, new NoLock())
  }

  _onAdopt(childOrigin: string): void {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    const parentJigOrigin = this.stack[this.stack.length - 1]
    childJigRef.setOwner(new JigLock(parentJigOrigin))
  }

  _onRelease(childOrigin: string, parentOrigin: string) {
    throw new Error('on release not implemented')
  }

  getWasmInstance (moduleName: string) {
    return this.wasms.get(moduleName)
  }

  getJigRef (index: number) {
    return this.jigs[index]
  }

  getJigRefByOrigin (origin: string): JigRef {
    const jigRef = this.jigs.find(jr => jr.origin === origin);
    if (!jigRef) {
      throw new Error('does not exists')
    }
    return jigRef
  }

  addInputJig (jigRef: JigRef) {
    return this.addNewJigRef(jigRef)
  }

  addNewJigRef (jigRef: JigRef) {
    this.jigs.push(jigRef)
    return jigRef
  }

  run () {
    this.tx.exec(this)
  }

  loadJig (location: string, force: boolean): JigRef {
    const jigState = this.vm.findJigState(location)
    if (force === true && location !== jigState.location) {
      throw new ExecutionError('jig already spent')
    }
    const module = this.loadModule(jigState.moduleId)
    const ref = module.hidrate(jigState.className, jigState.stateBuf)
    const lock = this._hidrateLock(jigState.serializedLock)
    const jigRef = new JigRef(ref, jigState.className, module, jigState.origin, lock)
    this.addNewJigRef(jigRef)
    return jigRef
  }

  _hidrateLock (frozenLock: any): Lock {
    if (frozenLock.type === 'UserLock') {
      return new UserLock(frozenLock.data.pubkey)
    } else if (frozenLock.type === 'JigLock') {
      return new JigLock(frozenLock.data.origin)
    } else {
      throw new Error('unknown lock type')
    }
  }

  lockJig (masterListIndex: number, lock: Lock) {
    const jigRef = this.getJigRef(masterListIndex)
    const stackTop = this.stack[this.stack.length - 1]
    if (!jigRef.lock.checkCaller(stackTop)) {
      throw new ExecutionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(lock)
  }

  instantiate (moduleId: string, className: string, args: any[], initialLock: Lock): JigRef {
    const module = this.loadModule(moduleId)
    const newOrigin = this.newOrigin()
    const jigRef = new JigRef(new JigPointer('null', 0), className, module, newOrigin, initialLock)
    this.addNewJigRef(jigRef)
    this.stack.push(newOrigin)
    jigRef.ref = module.createNew(className, args)
    this.stack.pop()
    return jigRef
  }

  call (masterListIndex: number, methodName: string, args: any[], caller: string): Uint8Array {
    const jigRef = this.getJigRef(masterListIndex)
    this.stack.push(jigRef.origin)
    const ret = jigRef.sendMessage(methodName, args, caller)
    this.stack.pop()
    return ret
  }

  newOrigin () {
    return locationF(this.tx, this.jigs.length)
  }
}

export { TxExecution }
