import {JigLock} from "./locks/jig-lock.js"
import {JigRef} from "./jig-ref.js"
import {ExecutionError, PermissionError} from "./errors.js"
import {UserLock} from "./locks/user-lock.js"
import {NoLock} from "./locks/no-lock.js"
import {JigState} from "./jig-state.js"
import {Transaction} from "./transaction.js";
import {VM} from "./vm.js";
import {AuthCheck, LockType, MethodResult, Prop, WasmInstance} from "./wasm-instance.js";
import {Lock} from "./locks/lock.js";
import {Externref, Internref, liftValue} from "./memory.js";
import {FieldNode, findExportedObject, findObjectMethod, TypeNode} from '@aldea/compiler/abi'
import {Address, Location} from '@aldea/sdk-js';
import {ArgReader, readType} from "./arg-reader.js";
import {PublicLock} from "./locks/public-lock.js";

abstract class StatementResult {
  abstract get abiNode(): TypeNode;
  abstract get value(): any;
  abstract get wasm(): WasmInstance;
  abstract get instance(): WasmInstance;
  abstract asJig (): JigRef;
}

class WasmStatementResult extends StatementResult {
  private _instance: WasmInstance;
  constructor(instance: WasmInstance) {
    super()
    this._instance = instance
  }

  get abiNode (): TypeNode {
    throw new ExecutionError('statement is not a value');
  }

  asJig(): JigRef {
    throw new ExecutionError('statement is not a jig');
  }

  get value (): any {
    throw new ExecutionError('statement is not a value');
  }

  get wasm(): WasmInstance {
    throw new ExecutionError('statement is not a value');
  }

  get instance(): WasmInstance {
    return this._instance;
  }
}

class ValueStatementResult extends StatementResult {
  abiNode: TypeNode
  value: any
  wasm: WasmInstance

  constructor(node: TypeNode, value: any, wasm: WasmInstance) {
    super()
    this.abiNode = node
    this.value = value
    this.wasm = wasm
  }

  asJig(): JigRef {
    if (this.value instanceof JigRef) {
      return this.value as JigRef
    } else {
      throw new ExecutionError(`${this.abiNode.name} is not a jig`)
    }
  }

  get instance(): WasmInstance {
    throw new ExecutionError('statement is not a wasm instance');
  }
}

class TxExecution {
  tx: Transaction;
  private vm: VM;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private stack: Location[];
  outputs: JigState[];
  statementResults: StatementResult[]

  constructor (tx: Transaction, vm: VM) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.wasms = new Map()
    this.stack = []
    this.outputs = []
    this.statementResults = []
  }

  finalize () {
    this.jigs.forEach(jigRef => {
      if (jigRef.lock.isOpen()) {
        throw new PermissionError(`unlocked jig: ${jigRef.origin}`)
      }
    })

    this.jigs.forEach((jigRef, index) => {
      const location = new Location(this.tx.hash(), index)
      const origin = jigRef.origin || location
      const serialized = jigRef.serialize() //  module.instanceCall(jigRef.ref, jigRef.className, 'serialize')
      const jigState = new JigState(origin, location , jigRef.className, serialized, jigRef.module.id, jigRef.lock.serialize())
      this.outputs.push(jigState)
    })
  }

  loadModule (moduleId: string): WasmInstance {
    const existing = this.wasms.get(moduleId)
    if (existing) { return existing }
    const wasmInstance = this.vm.createWasmInstance(moduleId)
    wasmInstance.setExecution(this)
    this.wasms.set(moduleId, wasmInstance)
    return wasmInstance
  }

  findRemoteUtxoHandler (origin: ArrayBuffer): JigRef {
    const jigRef = this.jigs.find(j => Buffer.from(j.originBuf).equals(Buffer.from(origin)))
    if(!jigRef) { throw new Error('should exist')}
    return jigRef
  }

  constructorHandler(source: WasmInstance, jigPtr: number, className: string): void {
    const origin = this.newOrigin()
    const existingRef = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === source)
    if (existingRef) {
      existingRef.className = className
      existingRef.ref.name = className
      return
    }
    const jigRef = new JigRef(new Internref(className, jigPtr), className, source, origin, new NoLock())
    this.addNewJigRef(jigRef)
  }

  localAuthCheckHandler(jigPtr: number, instance: WasmInstance, check: AuthCheck): boolean {
    const jig = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === instance) || this.jigs.find(j => j.ref.ptr === -1 && j.module === instance)
    if (!jig) {throw new Error('should exists')}
    return this.remoteAuthCheckHandler(jig.origin, check)
  }

  localLockHandler (jigPtr: number, instance: WasmInstance, type: LockType, extraArg: ArrayBuffer): void {
    const childJigRef = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === instance)
    if (!childJigRef) {
      throw new Error('should exists')
    }
    this.remoteLockHandler(childJigRef.origin, type, extraArg)
  }

  remoteCallHandler (callerInstance: WasmInstance, origin: Location, className: string, methodName: string, argBuff: ArrayBuffer): MethodResult {
    let jig = this.jigs.find(j => j.origin.equals(origin))
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
        return this.getJigRefByOrigin(Location.fromBuffer(value.originBuf))
      } else {
        return value
      }
    })

    return this.callInstanceMethod(jig, methodName, args)
  }

  remoteStaticExecHandler (srcModule: WasmInstance, targetModId: string, fnStr: string, argBuffer: ArrayBuffer): MethodResult {
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
        return this.getJigRefByOrigin(Location.fromBuffer(value.originBuf))
      } else {
        return value
      }
    })

    return targetMod.staticCall(className, methodName, argValues)
  }

  getPropHandler (origin: Location, propName: string): Prop {
    let jig = this.jigs.find(j => j.origin.equals(origin))
    if (!jig) {
      jig = this.loadJig(origin, false,false)
    }
    return jig.module.getPropValue(jig.ref, jig.className, propName)
  }

  // _onCreate (moduleId: string, className: string, args: any[]): JigRef {
  //   this.loadModule(moduleId)
  //   return this.instantiate(moduleId, className, args)
  // }

  remoteLockHandler (childOrigin: Location, type: LockType, extraArg: ArrayBuffer): void {
    const childJigRef = this.getJigRefByOrigin(childOrigin)
    if (!childJigRef.lock.canBeChangedBy(this)) {
      throw new PermissionError('lock cannot be changed')
    }
    if (type === LockType.CALLER) {
      const parentJigOrigin = this.stack[this.stack.length - 1]
      childJigRef.changeLock(new JigLock(parentJigOrigin))
    } else if (type === LockType.NONE) {
      childJigRef.changeLock(new NoLock())
    } else if (type === LockType.PUBKEY) {
      childJigRef.changeLock(new UserLock(new Address(new Uint8Array(extraArg))))
    } else if (type === LockType.ANYONE) {
      if (!this.stackTop().equals(childJigRef.origin)) {
        throw new ExecutionError('cannot make another jig public')
      }
      childJigRef.changeLock(new PublicLock())
    } else {
      throw new Error('not implemented yet')
    }
  }

  localCallStartHandler(wasmInstance: WasmInstance, jigPtr: number, fnName: string) {
    const targetJig = this.jigs.find(j => j.ref.ptr === jigPtr && j.module === wasmInstance) || this.jigs.find(j => j.ref.ptr === -1 && j.module === wasmInstance)
    if (!targetJig) {
      throw new Error('jig should exist')
    }
    if (!targetJig.lock.acceptsExecution(this)) {
      const stackTop = this.stackTop()
      if (stackTop) {
        throw new PermissionError(`jig ${targetJig.origin.toString()} is not allowed to exec "${fnName}" called from ${this.stackTop().toString()}`)
      } else {
        throw new PermissionError(`jig ${targetJig.origin.toString()} is not allowed to exec "${fnName}"`)
      }
    }
    this.stack.push(targetJig.origin)
  }

  localCallEndtHandler () {
    this.stack.pop()
  }


  remoteAuthCheckHandler (origin: Location, check: AuthCheck): boolean {
    const jigRef = this.jigs.find(jigR => jigR.origin.equals(origin))
    if (!jigRef) {
      throw new Error('jig ref should exists')
    }
    if (check === AuthCheck.CALL) {
      return jigRef.lock.acceptsExecution(this)
    } else {
      return jigRef.lock instanceof NoLock
    }
  }

  findUtxoHandler(wasm: WasmInstance, jigPtr: number): JigRef {
    const jigRef = this.jigs.find(ref => ref.module === wasm && ref.ref.ptr === jigPtr)
    if (!jigRef) {
      let origin = this.newOrigin();
      return this.addNewJigRef(new JigRef(
        new Internref('', jigPtr),
        '',
        wasm,
        origin,
        new NoLock()
      ))
    }
    return jigRef
  }

  getJigRefByOrigin (origin: Location): JigRef {
    const jigRef = this.jigs.find(jr => jr.origin.equals(origin));
    if (!jigRef) {
      throw new Error('does not exists')
    }
    return jigRef
  }

  addNewJigRef (jigRef: JigRef): JigRef {
    this.jigs.push(jigRef)
    return jigRef
  }

  run () {
    // const execVisitor = new ExecVisitor(this)
    // this.txHash.accept(execVisitor)
  }

  loadJig (location: Location, readOnly: boolean, force: boolean): JigRef {
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
      return new JigLock(Location.fromString(frozenLock.data.origin))
    } else if (frozenLock.type === 'PublicLock') {
      return new PublicLock()
    } else {
      throw new Error('unknown lock type')
    }
  }

  instantiate(statementIndex: number, className: string, args: any[]): number {
    const statement = this.statementResults[statementIndex]
    const instance = statement.instance
    this.stack.push(this.newOrigin())
    const result = instance.staticCall(className, 'constructor', args)
    this.stack.pop()
    const jigRef = this.jigs.find(j => j.module === instance && j.ref.ptr === result.value.ptr)
    if (!jigRef) { throw new Error('jig should be created')}

    this.statementResults.push(new ValueStatementResult(result.node, jigRef, result.mod))
    return this.statementResults.length - 1
  }

  callInstanceMethod (jig: JigRef, methodName: string, args: any[]): MethodResult {
    return jig.module.instanceCall(jig, jig.className, methodName, args)
  }

  callInstanceMethodByIndex (jigIndex: number, methodName: string, args: any[]): number {
    const jigRef = this.getStatementResult(jigIndex).asJig()
    const methodResult = this.callInstanceMethod(jigRef, methodName, args)
    this.statementResults.push(new ValueStatementResult(methodResult.node, methodResult.value, methodResult.mod))
    return this.statementResults.length - 1
  }

  execStaticMethod (varName: string, moduleId: string, className: string, methodName: string, args: any[]) {
    const module = this.loadModule(moduleId)
    const objectNode = findExportedObject(module.abi, className, 'should exist');
    const methodNode = findObjectMethod(
      objectNode,
      methodName,
      'should exist'
    )

    if (!methodNode.rtype) {
      module.staticCall(className, methodName, args)
      return null
    }

    const {node, value, mod} = module.staticCall(className, methodName, args)
    return new ValueStatementResult(
      node,
      value,
      mod
    )
  }

  newOrigin () {
    return new Location(this.tx.hash(), this.jigs.length)
  }

  stackTop () {
    return this.stack[this.stack.length - 1]
  }

  getStatementResult (index: number): StatementResult {
    const result = this.statementResults[index]
    if (!result) { throw new ExecutionError(`undefined index: ${index}`)}
    return result
  }

  lockJigToUser(jigIndex: number, address: Address) {
    const jigRef = this.getStatementResult(jigIndex).asJig()
    if (!jigRef.lock.canBeChangedBy(this)) {
      throw new PermissionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(new UserLock(address))
  }

  importModule(modId: string): number {
    const instance = this.loadModule(modId)
    this.statementResults.push(new WasmStatementResult(instance))
    return this.statementResults.length - 1
  }

  getImportedModule(moduleIndex: number): WasmInstance {
    return this.getStatementResult(moduleIndex).instance;
  }
}

export { TxExecution }
