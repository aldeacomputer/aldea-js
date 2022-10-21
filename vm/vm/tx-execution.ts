import {JigLock} from "./locks/jig-lock.js"
import {JigRef} from "./jig-ref.js"
import {ExecutionError, PermissionError} from "./errors.js"
import {UserLock} from "./locks/user-lock.js"
import {NoLock} from "./locks/no-lock.js"
import {locationF} from './location.js'
import {JigState} from "./jig-state.js"
import {Transaction} from "./transaction.js";
import {VM} from "./vm.js";
import {AuthCheck, LockType, MethodResult, Prop, WasmInstance} from "./wasm-instance.js";
import {Lock} from "./locks/lock.js";
import {Internref} from "./memory.js";
import {findExportedObject, findObjectMethod, MethodNode, ObjectKind} from '@aldea/compiler/abi'
import {PubKey, Signature, TxVisitor} from '@aldea/sdk-js';

class ExecVisitor implements TxVisitor {
  exec: TxExecution
  args: any[]
  constructor(txExecution: TxExecution) {
    this.exec = txExecution
    this.args = []
  }

  visitCall(masterListIndex: number, methodName: string): void {
    const target = this.exec.getJigRef(masterListIndex)
    target.sendMessage(methodName, this.args, this.exec)
    this.args = []
  }

  visitJigArg(masterListIndex: number): void {
    const jigRef = this.exec.getJigRef(masterListIndex)
    this.args.push(jigRef)
  }

  visitLoad(location: string, readonly: boolean, forceLocation: boolean): void {
    this.exec.loadJig(location, readonly, forceLocation)
  }

  visitLockInstruction(masterListIndex: number, pubkey: PubKey): void {
    this.exec.lockJig(masterListIndex, new UserLock(pubkey))
  }

  visitNew(moduleId: string, className: string): void {
    this.exec.instantiate(moduleId, className, this.args, new NoLock())
    this.args = []
  }

  visitNumberArg(value: number): void {
    this.args.push(value)
  }

  visitSignature(_sig: Signature): void {
    // noop
  }

  visitStringArg(value: string): void {
    this.args.push(value)
  }

  visitExec(moduleId: string, functionName: string): void {
    this.exec.execFunction(moduleId, functionName, this.args)
    this.args = []
  }

  visitBufferArg (buff: Uint8Array): void {
    this.args.push(buff)
  }
}

class TxExecution {
  tx: Transaction;
  private vm: VM;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private stack: string[];
  outputs: JigState[];

  constructor (tx: Transaction, vm: VM) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.wasms = new Map()
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
    wasmModule.onGetProp(this._onGetProp.bind(this))
    wasmModule.onCreate(this._onCreate.bind(this))
    wasmModule.onRemoteLockHandler(this._onRemoteLock.bind(this))
    wasmModule.onRelease(this._onRelease.bind(this))
    wasmModule.onFindUtxo(this._onFindUtxo.bind(this))
    wasmModule.onLocalLock(this._onLocalLock.bind(this))
    wasmModule.onLocalCallStart(this._onLocalCallStart.bind(this))
    wasmModule.onLocalCallEnd(this._onLocalCallEnd.bind(this))
    wasmModule.onAuthCheck(this._onAuthCheck.bind(this))
    wasmModule.onLocalAuthCheck(this._onLocalAuthCheck.bind(this))
    this.wasms.set(moduleId, wasmModule)
    return wasmModule
  }

  _onLocalAuthCheck(jigPtr: number, instance: WasmInstance, check: AuthCheck): boolean {
    const jig = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === instance) || this.jigs.find(j => j.ref.ptr === -1 && j.module === instance)
    if (!jig) {throw new Error('should exists')}
    return this._onAuthCheck(jig.origin, check)
  }

  _onLocalLock(jigPtr: number, instance: WasmInstance, type: LockType, extraArg: ArrayBuffer): void {
    const childJigRef = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === instance)
    if (!childJigRef) {throw new Error('should exists')}
    this._onRemoteLock(childJigRef.origin, type, extraArg)
    // childJigRef.changeLock(new JigLock(this.stack[this.stack.length - 1]))
  }

  _onMethodCall (origin: string, methodNode: MethodNode, args: any[]): MethodResult {
    let jig = this.jigs.find(j => j.origin === origin) as JigRef
    if (!jig) {
      jig = this.loadJig(origin, false,false)
    }

    return jig.sendMessage(methodNode.name, args, this)
  }

  _onGetProp (origin: string, propName: string): Prop {
    let jig = this.jigs.find(j => j.origin === origin)
    if (!jig) {
      jig = this.loadJig(origin, false,false)
    }
    return jig.module.getPropValue(jig.ref, jig.className, propName)
  }

  _onCreate (moduleId: string, className: string, args: any[]): JigRef {
    this.loadModule(moduleId)
    return this.instantiate(moduleId, className, args, new NoLock())
  }

  _onRemoteLock (childOrigin: string, type: LockType, extraArg: ArrayBuffer): void {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    if (!childJigRef.lock.acceptsExecution(this)) {
      throw new Error('lock cannot be changed')
    }
    if (type === LockType.PARENT) {
      const parentJigOrigin = this.stack[this.stack.length - 1]
      childJigRef.changeLock(new JigLock(parentJigOrigin))
    } else if (type === LockType.NONE) {
      childJigRef.changeLock(new NoLock())
    } else if (type === LockType.PUBKEY) {
      childJigRef.changeLock(new UserLock(PubKey.fromBytes(new Uint8Array(extraArg))))
    } else {
      throw new Error('not implemented yet')
    }
  }

  _onRelease(_childOrigin: string, _parentOrigin: string) {
    throw new Error('on release not implemented')
  }

  _onLocalCallStart(jigPtr: number, wasmInstance: WasmInstance) {
    const jig = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === wasmInstance) || this.jigs.find(j => j.ref.ptr === -1 && j.module === wasmInstance)
    if (!jig) {
      throw new Error('jig should exist')
    }
    this.stack.push(jig.origin)
  }

  _onLocalCallEnd () {
    this.stack.pop()
  }


  private _onAuthCheck (origin: string, check: AuthCheck): boolean {
    const jigRef = this.jigs.find(jigR => jigR.origin === origin)
    if (!jigRef) {
      throw new Error('jig ref should exists')
    }
    if (check === AuthCheck.CALL) {
      return jigRef.lock.acceptsExecution(this)
    } else {
      return jigRef.lock instanceof NoLock
    }
  }

  private _onFindUtxo(jigPtr: number): JigRef {
    const jigRef = this.jigs.find(ref => ref.ref.ptr === jigPtr || ref.ref.ptr === -1)
    if (!jigRef) {
      throw new Error('jig should exist')
    }
    return jigRef
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
    const execVisitor = new ExecVisitor(this)
    this.tx.accept(execVisitor)
  }

  loadJig (location: string, readOnly: boolean, force: boolean): JigRef {
    const jigState = this.vm.findJigState(location)
    if (force && location !== jigState.location) {
      throw new ExecutionError('jig already spent')
    }
    const module = this.loadModule(jigState.moduleId)
    const ref = module.hidrate(jigState.className, jigState.stateBuf)
    const lock = this._hidrateLock(jigState.serializedLock)
    if (lock instanceof UserLock && !readOnly) {
      lock.open()
    }
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
    if (!jigRef.lock.acceptsExecution(this)) {
      throw new ExecutionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(lock)
  }

  instantiate (moduleId: string, className: string, args: any[], initialLock: Lock): JigRef {
    const module = this.loadModule(moduleId)
    const newOrigin = this.newOrigin()
    const jigRef = new JigRef(new Internref(className, -1), className, module, newOrigin, initialLock)
    this.addNewJigRef(jigRef)
    this.stack.push(newOrigin)
    jigRef.ref = module.createNew(className, args)
    this.stack.pop()
    return jigRef
  }

  execFunction (moduleId: string, functionName: string, args: any[]) {
    const module = this.loadModule(moduleId)
    const [className, methodName] = functionName.split('_')
    const abiNode = findExportedObject(module.abi, className, 'should exist')
    const methodNode = findObjectMethod(abiNode, methodName, 'should exist')
    if(!methodNode.rtype) { throw Error('should exist')}
    const rTypeNode = findExportedObject(module.abi, methodNode.rtype.name, 'should exist')
    if (rTypeNode.kind === ObjectKind.EXPORTED) {
      const module = this.loadModule(moduleId)
      const newOrigin = this.newOrigin()
      const jigRef = new JigRef(new Internref(className, -1), className, module, newOrigin, new NoLock())
      this.addNewJigRef(jigRef)
      this.stack.push(newOrigin)
      const retPtr = module.staticCall(className, methodName, args)
      jigRef.ref = new Internref(moduleId, retPtr)
      this.stack.pop()
      return jigRef.ref
    } else {
      const retPtr = module.staticCall(className, 'constructor', args)
      return new Internref(moduleId, retPtr)
    }
  }

  newOrigin () {
    return locationF(this.tx, this.jigs.length)
  }

  stackTop () {
    return this.stack[this.stack.length - 1]
  }
}

export { TxExecution }
