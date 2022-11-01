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
import {Externref, Internref, liftValue} from "./memory.js";
import {
  FieldNode,
  findExportedFunction,
  findExportedObject,
  findObjectMethod,
  ObjectKind
} from '@aldea/compiler/abi'
import {PubKey, Signature, TxVisitor} from '@aldea/sdk-js';
import {ArgReader, readType} from "./arg-reader.js";
import {PublicLock} from "./locks/public-lock.js";

class ExecVisitor implements TxVisitor {
  exec: TxExecution
  args: any[]
  constructor(txExecution: TxExecution) {
    this.exec = txExecution
    this.args = []
  }

  visitCall (varName:string, methodName:string): void {
    const target = this.exec.getJigRefByVarName(varName)
    target.sendMessage(methodName, this.args, this.exec)
    this.args = []
  }

  visitLoad(varName: string, location: string, readonly: boolean, forceLocation: boolean): void {
    this.exec.loadJigIntoVariable(varName, location, readonly, forceLocation)
  }

  visitLockInstruction(varName:string, pubkey:PubKey): void {
    this.exec.lockJigByVarName(varName, new UserLock(pubkey))
  }

  visitNew(varName:string, moduleId:string, className:string): void {
    this.exec.instantiate(varName, moduleId, className, this.args, new NoLock())
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

  visitExec(varName: string, moduleId: string, functionName: string): void {
    const wasm = this.exec.loadModule(moduleId)
    const fnNode = findExportedFunction(wasm.abi, functionName)

    if (fnNode) {
      this.exec.execFunction(varName, moduleId, functionName, this.args)
    } else {
      const [className, methodName] = functionName.split('_')
      this.exec.execStaticMethod(varName, moduleId, className, methodName, this.args)
    }
    this.args = []
  }

  visitBufferArg (buff: Uint8Array): void {
    this.args.push(buff)
  }

  acceptAssign(varName: string, masterListIndex: number): void {
    this.exec.assignToVar(varName, masterListIndex)
  }

  visitVariableContent(varName: string): void {
    const jigRef = this.exec.getJigRefByVarName(varName)
    this.args.push(jigRef)
  }
}

class TxExecution {
  tx: Transaction;
  private vm: VM;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private stack: string[];
  outputs: JigState[];
  private variables: Map<string, JigRef>;

  constructor (tx: Transaction, vm: VM) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.variables = new Map()
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

  loadModule (moduleId: string): WasmInstance {
    const existing = this.wasms.get(moduleId)
    if (existing) { return existing }
    const wasmInstance = this.vm.createWasmInstance(moduleId)
    wasmInstance.onMethodCall(this._onRemoteInstanceCall.bind(this))
    wasmInstance.onGetProp(this._onGetProp.bind(this))
    wasmInstance.onCreate(this._onCreate.bind(this))
    wasmInstance.onRemoteLockHandler(this._onRemoteLock.bind(this))
    wasmInstance.onRelease(this._onRelease.bind(this))
    wasmInstance.onFindUtxo(this._onFindUtxo.bind(this))
    wasmInstance.onLocalLock(this._onLocalLock.bind(this))
    wasmInstance.onLocalCallStart(this._onLocalCallStart.bind(this))
    wasmInstance.onLocalCallEnd(this._onLocalCallEnd.bind(this))
    wasmInstance.onAuthCheck(this._onAuthCheck.bind(this))
    wasmInstance.onLocalAuthCheck(this._onLocalAuthCheck.bind(this))
    wasmInstance.onRemoteStaticExecHandler(this._onRemoteStaticExecHandler.bind(this))
    this.wasms.set(moduleId, wasmInstance)
    return wasmInstance
  }

  _onLocalAuthCheck(jigPtr: number, instance: WasmInstance, check: AuthCheck): boolean {
    const jig = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === instance) || this.jigs.find(j => j.ref.ptr === -1 && j.module === instance)
    if (!jig) {throw new Error('should exists')}
    return this._onAuthCheck(jig.origin, check)
  }

  _onLocalLock(jigPtr: number, instance: WasmInstance, type: LockType, extraArg: ArrayBuffer): void {
    const childJigRef = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === instance) || this.jigs.find(j => j.module === instance && j.ref.ptr === -1)
    if (!childJigRef) {throw new Error('should exists')}
    this._onRemoteLock(childJigRef.origin, type, extraArg)
  }

  _onRemoteInstanceCall (callerInstance: WasmInstance, origin: string, className: string,  methodName: string, argBuff: ArrayBuffer): MethodResult {
    let jig = this.jigs.find(j => j.origin === origin) as JigRef
    if (!jig) {
      jig = this.loadJig(origin, false,false)
    }

    const obj = findExportedObject(jig.module.abi, className, 'could not find object')
    const method = findObjectMethod(obj, methodName, 'could not find method')

    const argReader = new ArgReader(argBuff)
    const args = method.args.map((n: FieldNode) => {
      const ptr = readType(argReader, n.type)
      const value = liftValue(callerInstance, n.type, ptr)
      if (value instanceof Externref) {
        return this.getJigRefByOrigin(Buffer.from(value.origin).toString())
      } else {
        return value
      }
    })



    return jig.sendMessage(methodName, args, this)
  }

  _onRemoteStaticExecHandler (srcModule: WasmInstance, targetModId: string, fnStr: string, argBuffer: ArrayBuffer): MethodResult {
    const targetMod = this.loadModule(targetModId)

    const [className, methodName] = fnStr.split('_')

    const obj = findExportedObject(targetMod.abi, className, 'could not find object')
    const method = findObjectMethod(obj, methodName, 'could not find method')

    const argReader = new ArgReader(argBuffer)
    const argValues = method.args.map((arg) => {
      const pointer = readType(argReader, arg.type)
      return liftValue(srcModule, arg.type, pointer)
    }).map((value: any) => {
      if (value instanceof Externref) {
        return this.getJigRefByOrigin(Buffer.from(value.origin).toString())
      } else {
        return value
      }
    })

    return targetMod.staticCall(className, methodName, argValues)
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
    return this.instantiate('', moduleId, className, args, new NoLock())
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
    } else if (type === LockType.ANYONE) {
      if (this.stackTop() !== childJigRef.origin) {
        throw new ExecutionError('cannot make another jig public')
      }
      childJigRef.changeLock(new PublicLock())
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

  loadJigIntoVariable(varName: string, location: string, readOnly: boolean, force: boolean): JigRef {
    const jigRef = this.loadJig(location, readOnly, force)
    this.setVar(varName, jigRef)
    return jigRef
  }

  _hidrateLock (frozenLock: any): Lock {
    if (frozenLock.type === 'UserLock') {
      return new UserLock(frozenLock.data.pubkey)
    } else if (frozenLock.type === 'JigLock') {
      return new JigLock(frozenLock.data.origin)
    } else if (frozenLock.type === 'PublicLock') {
      return new PublicLock()
    } else {
      throw new Error('unknown lock type')
    }
  }

  lockJigByIndex (index: number, lock: Lock) {
    const jigRef = this.getJigRef(index)
    if (!jigRef.lock.acceptsExecution(this)) {
      throw new ExecutionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(lock)
  }

  lockJigByVarName(varName: string, lock: Lock) {
    const jigRef = this.getJigRefByVarName(varName)
    if (!jigRef.lock.canBeChangedBy(this)) {
      throw new PermissionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(lock)
  }

  instantiate(varName: string, moduleId: string, className: string, args: any[], initialLock: Lock): JigRef {
    const module = this.loadModule(moduleId)
    const newOrigin = this.newOrigin()
    const jigRef = new JigRef(new Internref(className, -1), className, module, newOrigin, initialLock)
    this.setVar(varName, jigRef)
    this.addNewJigRef(jigRef)
    this.stack.push(newOrigin)
    jigRef.ref = module.createNew(className, args)
    this.stack.pop()
    return jigRef
  }

  execStaticMethod (varName: string, moduleId: string, className: string, methodName: string, args: any[]) {
    const module = this.loadModule(moduleId)
    const methodNode = findObjectMethod(
      findExportedObject(module.abi, className, 'should exist'),
      methodName,
      'should exist'
    )
    if (!methodNode.rtype) {
      module.staticCall(className, methodName, args)
      return null
    }

    const rTypeNode = findExportedObject(module.abi, methodNode.rtype.name)
    if (!rTypeNode || rTypeNode.kind !== ObjectKind.EXPORTED) {
      const result = module.staticCall(className, methodName, args)
      return new Internref(className, result.value)
    }  else {
      const module = this.loadModule(moduleId)
      const newOrigin = this.newOrigin()
      const jigRef = new JigRef(new Internref(className, -1), className, module, newOrigin, new NoLock())
      this.addNewJigRef(jigRef)
      this.stack.push(newOrigin)
      const result = module.staticCall(className, methodName, args)
      jigRef.ref = result.value
      this.stack.pop()
      this.setVar(varName, jigRef)
      return jigRef.ref
    }
  }

  execFunction (varName: string, moduleId: string, functionName: string, args: any[]) {
    const module = this.loadModule(moduleId)
    const fnNode = findExportedFunction(module.abi, functionName, 'should exist')
    const rtypeClassName = fnNode.rtype.name;
    const rTypeNode = findExportedObject(module.abi, rtypeClassName, 'should exist')
    if (rTypeNode.kind === ObjectKind.EXPORTED) {
      const module = this.loadModule(moduleId)
      const newOrigin = this.newOrigin()
      const jigRef = new JigRef(new Internref(rtypeClassName, -1), rtypeClassName, module, newOrigin, new NoLock())
      this.addNewJigRef(jigRef)
      this.stack.push(newOrigin)
      const result = module.functionCall(functionName, args)
      jigRef.ref = result.value
      this.stack.pop()
      this.setVar(varName, jigRef)
      return jigRef.ref
    } else {
      const result = module.functionCall(functionName, args)
      return new Internref(moduleId, result.value)
    }
  }

  newOrigin () {
    return locationF(this.tx, this.jigs.length)
  }

  stackTop () {
    return this.stack[this.stack.length - 1]
  }

  getJigRefByVarName(varName: string): JigRef {
    const ret = this.variables.get(varName)
    if (!ret) {
      throw new Error(`unknown variable: ${varName}`)
    }
    return ret
  }

  assignToVar (varName: string, jigIndex: number): void {
    const jigRef = this.jigs[jigIndex]
    if (!jigRef) {
      throw new Error(`index out of bounds: ${jigIndex}`)
    }
    this.setVar(varName, jigRef)
  }

  private setVar(varName: string, jigRef: JigRef) {
    this.variables.set(varName, jigRef)
  }
}

export { TxExecution }
