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
import {ArgNode, ClassNode, CodeKind, findClass, findMethod, TypeNode} from '@aldea/compiler/abi'
import {Address, base16, instructions, Pointer, Tx} from '@aldea/sdk-js';
import {ArgReader, readType} from "./arg-reader.js";
import {PublicLock} from "./locks/public-lock.js";
import {FrozenLock} from "./locks/frozen-lock.js";

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

class EmptyStatementResult extends StatementResult {
  get abiNode(): TypeNode {
    throw new ExecutionError('wrong index')
  }

  asJig(): JigRef {
    throw new ExecutionError('wrong index')
  }

  get instance(): WasmInstance {
    throw new ExecutionError('wrong index')
  }

  get value(): any {
    throw new ExecutionError('wrong index')
  }

  get wasm(): WasmInstance {
    throw new ExecutionError('wrong index')
  }

}

class TxExecution {
  tx: Tx;
  private vm: VM;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private stack: Pointer[];
  outputs: JigState[];
  deployments: Uint8Array[];
  statementResults: StatementResult[]
  private funded: boolean;

  constructor(tx: Tx, vm: VM) {
    this.tx = tx
    this.vm = vm
    this.jigs = []
    this.wasms = new Map()
    this.stack = []
    this.outputs = []
    this.statementResults = []
    this.funded = false
    this.deployments = []
  }

  finalize () {
    if (!this.funded) {
      throw new ExecutionError('tx not funded')
    }
    this.jigs.forEach(jigRef => {
      if (jigRef.lock.isOpen()) {
        throw new PermissionError(`unlocked jig: ${jigRef.origin}`)
      }
    })

    this.jigs.forEach((jigRef, index) => {
      const location = new Pointer(this.tx.hash, index)
      const origin = jigRef.origin || location
      const serialized = jigRef.serialize() //  module.instanceCall(jigRef.ref, jigRef.className, 'serialize')
      const jigState = new JigState(origin, location , jigRef.classIdx, serialized, jigRef.package.id, jigRef.lock.serialize())
      this.outputs.push(jigState)
    })
  }

  loadModule (moduleId: Uint8Array): WasmInstance {
    const existing = this.wasms.get(base16.encode(moduleId))
    if (existing) { return existing }
    const wasmInstance = this.vm.createWasmInstance(moduleId)
    wasmInstance.setExecution(this)
    this.wasms.set(base16.encode(moduleId), wasmInstance)
    return wasmInstance
  }

  findRemoteUtxoHandler (origin: ArrayBuffer): JigRef {
    const jigRef = this.jigs.find(j => Buffer.from(j.originBuf).equals(Buffer.from(origin)))
    if(!jigRef) { throw new Error('should exist')}
    return jigRef
  }

  constructorHandler(source: WasmInstance, jigPtr: number, className: string): void {
    const origin = this.createNextOrigin()
    const existingRef = this.jigs.find(j => j.ref.ptr === jigPtr && j.package === source)
    const classIdx = source.abi.exports.findIndex(e => e.code.name === className)
    if (existingRef) {
      existingRef.classIdx = classIdx
      existingRef.ref.name = className
      return
    }
    const jigRef = new JigRef(new Internref(className, jigPtr), classIdx, source, origin, new NoLock())
    this.addNewJigRef(jigRef)
  }

  localAuthCheckHandler(jigPtr: number, instance: WasmInstance, check: AuthCheck): boolean {
    const jig = this.jigs.find(j => j.ref.ptr === jigPtr && j.package === instance) || this.jigs.find(j => j.ref.ptr === -1 && j.package === instance)
    if (!jig) {throw new Error('should exists')}
    return this.remoteAuthCheckHandler(jig.origin, check)
  }

  localLockHandler (jigPtr: number, instance: WasmInstance, type: LockType, extraArg: ArrayBuffer): void {
    const childJigRef = this.jigs.find(j => j.ref.ptr === jigPtr && j.package === instance)
    if (!childJigRef) {
      throw new Error('should exists')
    }
    this.remoteLockHandler(childJigRef.origin, type, extraArg)
  }

  remoteCallHandler (callerInstance: WasmInstance, origin: Pointer, className: string, methodName: string, argBuff: Uint8Array): MethodResult {
    let jig = this.jigs.find(j => j.origin.equals(origin))
    if (!jig) {
      jig = this.findJigByOrigin(origin)
    }

    const klassNode = findClass(jig.package.abi, className, 'could not find object')
    const method = findMethod(klassNode, methodName, 'could not find method')

    const argReader = new ArgReader(argBuff)
    const args = method.args.map((n: ArgNode) => {
      const ptr = readType(argReader, n.type)
      const value = liftValue(callerInstance, n.type, ptr)
      if (value instanceof Externref) {
        return this.getJigRefByOrigin(Pointer.fromBytes(value.originBuf))
      } else {
        return value
      }
    })

    return this.callInstanceMethod(jig, methodName, args)
  }

  remoteStaticExecHandler (srcModule: WasmInstance, targetModId: Uint8Array, fnStr: string, argBuffer: Uint8Array): MethodResult {
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
        return this.getJigRefByOrigin(Pointer.fromBytes(value.originBuf))
      } else {
        return value
      }
    })

    return targetMod.staticCall(className, methodName, argValues)
  }

  getPropHandler (origin: Pointer, propName: string): Prop {
    let jig = this.jigs.find(j => j.origin.equals(origin))
    if (!jig) {
      jig = this.findJigByOrigin(origin)
    }
    return jig.package.getPropValue(jig.ref, jig.classIdx, propName)
  }

  // _onCreate (moduleId: string, className: string, args: any[]): JigRef {
  //   this.loadModule(moduleId)
  //   return this.instantiate(moduleId, className, args)
  // }

  remoteLockHandler (childOrigin: Pointer, type: LockType, extraArg: ArrayBuffer): void {
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
    } else if (type === LockType.FROZEN) {
      childJigRef.changeLock(new FrozenLock())
    } else {
      throw new Error('not implemented yet')
    }
  }

  localCallStartHandler(wasmInstance: WasmInstance, jigPtr: number, fnName: string) {
    const targetJig = this.jigs.find(j => j.ref.ptr === jigPtr && j.package === wasmInstance) || this.jigs.find(j => j.ref.ptr === -1 && j.package === wasmInstance)
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


  remoteAuthCheckHandler (origin: Pointer, check: AuthCheck): boolean {
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
    const jigRef = this.jigs.find(ref => ref.package === wasm && ref.ref.ptr === jigPtr)
    if (!jigRef) {
      let origin = this.createNextOrigin();
      return this.addNewJigRef(new JigRef(
        new Internref('', jigPtr),
        -1,
        wasm,
        origin,
        new NoLock()
      ))
    }
    return jigRef
  }

  getJigRefByOrigin (origin: Pointer): JigRef {
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
    let i = 0
    for (const inst of this.tx.instructions) {
      if (inst instanceof instructions.ImportInstruction) {
        this.importModule(inst.origin)
      } else if (inst instanceof instructions.NewInstruction) {
        const wasm = this.getStatementResult(inst.idx).instance
        const className = wasm.abi.exports[inst.exportIdx].code.name
        this.instantiate(inst.idx, className, inst.args)
      } else if (inst instanceof instructions.CallInstruction) {
        const jig = this.getStatementResult(inst.idx).asJig()
        const classNode = jig.package.abi.exports[jig.classIdx].code as ClassNode
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
        this.loadJigByOutputId(inst.outputId)
      } else if (inst instanceof instructions.LoadByOriginInstruction) {
        this.loadJigByOrigin(Pointer.fromBytes(inst.origin))
      } else if (inst instanceof instructions.SignInstruction) {
        this.statementResults.push(new EmptyStatementResult())
      } else if (inst instanceof instructions.SignToInstruction) {
        this.statementResults.push(new EmptyStatementResult())
      } else if (inst instanceof instructions.DeployInstruction) {
        await this.deployModule(inst.entry, inst.code)
      } else if (inst instanceof instructions.FundInstruction) {
        this.callInstanceMethodByIndex(inst.idx, 'fund', [])
        this.markAsFunded()
        // this.statementResults.push(this.getStatementResult(inst.idx))
        // try {
        //   this.callInstanceMethodByIndex(inst.idx, 'fund', [])
        // } catch (e) {
        //   throw new ExecutionError('not enough coins')
        // }
      } else {
        throw new ExecutionError(`unknown instruction: ${inst.opcode}`)
      }
      i++
    }
    this.finalize()
  }

  findJigByOutputId (outputId: Uint8Array): JigRef {
    const jigState = this.vm.findJigStateByOutputId(outputId)
    return this.hydrateJigState(jigState)
  }

  findJigByOrigin (origin: Pointer): JigRef {
    const jigState = this.vm.findJigStateByOrigin(origin)
    return this.hydrateJigState(jigState)
  }

  private hydrateJigState(state: JigState): JigRef {
    const module = this.loadModule(state.packageId)
    const ref = module.hidrate(state.classIdx, state.stateBuf)
    const lock = this.hidrateLock(state.serializedLock)
    const jigRef = new JigRef(ref, state.classIdx, module, state.origin, lock)
    this.addNewJigRef(jigRef)
    return jigRef
  }

  loadJigByOutputId (outputId: Uint8Array): number {
    const jigRef = this.findJigByOutputId(outputId)
    const typeNode = {
      name: jigRef.className(),
      args: <TypeNode[]>[]
    }
    this.statementResults.push(new ValueStatementResult(typeNode, jigRef, jigRef.package))
    return this.statementResults.length - 1
  }

  loadJigByOrigin (origin: Pointer): number {
    const jigRef = this.findJigByOrigin(origin)
    const typeNode = {
      name: jigRef.className(),
      args: <TypeNode[]>[]
    }
    this.statementResults.push(new ValueStatementResult(typeNode, jigRef, jigRef.package))
    return this.statementResults.length - 1
  }

  private hidrateLock (frozenLock: any): Lock {
    if (frozenLock.type === LockType.PUBKEY) {
      return new UserLock(new Address(frozenLock.data))
    } else if (frozenLock.type === LockType.CALLER) {
      return new JigLock(Pointer.fromBytes(frozenLock.data))
    } else if (frozenLock.type === LockType.ANYONE) {
      return new PublicLock()
    } else if (frozenLock.type === LockType.FROZEN) {
      return new FrozenLock()
    } else {
      throw new Error(`unknown lock type: ${frozenLock.type}`)
    }
  }

  instantiate(statementIndex: number, className: string, args: any[]): number {
    const statement = this.statementResults[statementIndex]
    const instance = statement.instance
    this.stack.push(this.createNextOrigin())
    const result = instance.staticCall(className, 'constructor', args)
    this.stack.pop()
    const jigRef = this.jigs.find(j => j.package === instance && j.ref.ptr === result.value.ptr)
    if (!jigRef) { throw new Error('jig should be created')}

    this.statementResults.push(new ValueStatementResult(result.node, jigRef, result.mod))
    return this.statementResults.length - 1
  }

  callInstanceMethod (jig: JigRef, methodName: string, args: any[]): MethodResult {
    return jig.package.instanceCall(jig, jig.className(), methodName, args)
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
      value = this.jigs.find(j => j.package === module && j.ref.equals(value))
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

  createNextOrigin () {
    return new Pointer(this.tx.hash, this.jigs.length)
  }

  stackTop () {
    return this.stack[this.stack.length - 1]
  }

  getStatementResult (index: number): StatementResult {
    const result = this.statementResults[index]
    if (!result) { throw new ExecutionError(`undefined index: ${index}`)}
    return result
  }

  lockJigToUser(jigIndex: number, address: Address): void {
    const jigRef = this.getStatementResult(jigIndex).asJig()
    if (!jigRef.lock.canBeChangedBy(this)) {
      throw new PermissionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.close(new UserLock(address))
    this.statementResults.push(this.getStatementResult(jigIndex))
  }

  importModule(modId: Uint8Array): number {
    const instance = this.loadModule(modId)
    this.statementResults.push(new WasmStatementResult(instance))
    return this.statementResults.length - 1
  }

  getImportedModule(moduleIndex: number): WasmInstance {
    return this.getStatementResult(moduleIndex).instance;
  }

  async deployModule(entryPoint: string[], sources: Map<string, string>): Promise<number> {
    const moduleId = await this.vm.deployCode(entryPoint, sources)
    const index = this.importModule(moduleId);
    this.deployments.push(moduleId)
    return index
  }

  execLength() {
    return this.statementResults.length
  }

  markAsFunded() {
    this.funded = true
  }
}

export { TxExecution }
