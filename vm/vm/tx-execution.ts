import {JigLock} from "./locks/jig-lock.js"
import {JigRef} from "./jig-ref.js"
import {ExecutionError, PermissionError} from "./errors.js"
import {UserLock} from "./locks/user-lock.js"
import {NoLock} from "./locks/no-lock.js"
import {JigState} from "./jig-state.js"
import {VM} from "./vm.js";
import {AuthCheck, LockType, MethodResult, Prop, WasmInstance} from "./wasm-instance.js";
import {Lock} from "./locks/lock.js";
import {Externref, Internref, liftValue} from "./memory.js";
import {ArgNode, findClass, findMethod, TypeNode, ClassNode, CodeKind} from '@aldea/compiler/abi'
import {
  Address,
  Location,
  Tx,
  instructions
} from '@aldea/sdk-js';
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
class NullStatementResult extends StatementResult {
  get abiNode(): TypeNode {
    throw new Error('null')
  }

  asJig(): JigRef {
    throw new Error('null')
  }

  get instance(): WasmInstance {
    throw new Error('null')
  }

  get value(): any {
    throw new Error('null')
  }

  get wasm(): WasmInstance {
    throw new Error('null')
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
  tx: Tx;
  private vm: VM;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private stack: Location[];
  outputs: JigState[];
  statementResults: StatementResult[]

  constructor(tx: Tx, vm: VM) {
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
      const location = new Location(this.tx.hash, index)
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
      jig = this.findJig(origin, false,false)
    }

    const klassNode = findClass(jig.module.abi, className, 'could not find object')
    const method = findMethod(klassNode, methodName, 'could not find method')

    const argReader = new ArgReader(argBuff)
    const args = method.args.map((n: ArgNode) => {
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

    const obj = findClass(targetMod.abi, className, 'could not find object')
    const method = findMethod(obj, methodName, 'could not find method')

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
      jig = this.findJig(origin, false,false)
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

  async run (): Promise<void> {
    for (const inst of this.tx.instructions) {
      if (inst instanceof instructions.ImportInstruction) {
        this.importModule(Buffer.from(inst.origin).toString('hex'))
      } else if (inst instanceof instructions.NewInstruction) {
        const wasm = this.getStatementResult(inst.idx).instance
        const className = wasm.abi.exports[inst.exportIdx].code.name
        this.instantiate(inst.idx, className, inst.args)
      } else if (inst instanceof instructions.CallInstruction) {
        const jig = this.getStatementResult(inst.idx).asJig()
        const classNode = findClass(jig.module.abi, jig.className, 'class should be present')
        const methodName = classNode.methods[inst.methodIdx].name
        this.callInstanceMethodByIndex(inst.idx, methodName, inst.args)
      } else if (inst instanceof instructions.ExecInstruction) {
        const wasm = this.getStatementResult(inst.idx).instance
        const exportNode = wasm.abi.exports[inst.exportIdx]
        if (exportNode.kind !== CodeKind.CLASS) { throw new Error('not a class')}
        const klassNode = exportNode.code as ClassNode
        const methodNode = klassNode.methods[inst.methodIdx]
        this.execStaticMethodByIndex(inst.idx, exportNode.code.name, methodNode.name, inst.args)
      } else if (inst instanceof instructions.LockInstruction) {
        this.lockJigToUser(inst.idx, new Address(inst.pubkeyHash))
      } else if (inst instanceof instructions.LoadInstruction) {
        this.loadJig(Location.fromBuffer(inst.location), false, true)
      } else if (inst instanceof instructions.LoadByOriginInstruction) {
        this.loadJig(Location.fromBuffer(inst.origin.buffer), false, false)
      } else if (inst instanceof instructions.SignInstruction) {
        continue // noop
      } else if (inst instanceof instructions.SignToInstruction) {
        continue // noop
      } else if (inst instanceof instructions.DeployInstruction) {
        await this.deployModule(inst.entry[0], inst.code)
      } else if (inst instanceof instructions.FundInstruction) {
        throw new ExecutionError('fund not implemented')
      } else {
        throw new ExecutionError(`unknown instruction: ${inst.opcode}`)
      }
    }
    this.finalize()
  }

  findJig (location: Location, readOnly: boolean, force: boolean): JigRef {
    const jigState = this.vm.findJigState(location)
    if (force && !location.equals(jigState.location)) {
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

  loadJig (location: Location, readOnly: boolean, force: boolean): number {
    const jigRef = this.findJig(location, readOnly, force)
    const typeNode = {
      name: jigRef.className,
      args: []
    }
    this.statementResults.push(new ValueStatementResult(typeNode, jigRef, jigRef.module))
    return this.statementResults.length - 1
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

  execStaticMethod (wasm: WasmInstance, className: string, methodName: string, args: any[]): ValueStatementResult {
    const module = wasm
    const objectNode = findClass(module.abi, className, 'should exist');
    const methodNode = findMethod(
      objectNode,
      methodName,
      'should exist'
    )

    if (!methodNode.rtype) {
      module.staticCall(className, methodName, args)
      return new NullStatementResult()
    }

    let {node, value, mod} = module.staticCall(className, methodName, args)
    if (value instanceof Internref) {
      value = this.jigs.find(j => j.module === module && j.ref.equals(value))
    }
    return new ValueStatementResult(
      node,
      value,
      mod
    )
  }

  execStaticMethodByIndex (moduleIndex: number, className: string, methodName: string, args: any[]): number {
    const wasm = this.getStatementResult(moduleIndex).instance
    const result = this.execStaticMethod(wasm, className, methodName, args)
    this.statementResults.push(result)
    return this.statementResults.length - 1
  }

  newOrigin () {
    return new Location(this.tx.hash, this.jigs.length)
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

  async deployModule(entryPoint: string, sources: Map<string, string>): Promise<number> {
    const source = sources.get(entryPoint)
    if (!source) {
      throw new ExecutionError('entry file is not present.')
    }
    const moduleId = await this.vm.deployCode(entryPoint, sources)
    return this.importModule(moduleId)
  }

  execLength() {
    return this.statementResults.length
  }
}

export { TxExecution }
