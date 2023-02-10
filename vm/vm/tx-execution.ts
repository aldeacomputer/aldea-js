import {JigLock} from "./locks/jig-lock.js"
import {JigRef} from "./jig-ref.js"
import {ExecutionError, PermissionError} from "./errors.js"
import {UserLock} from "./locks/user-lock.js"
import {NoLock} from "./locks/no-lock.js"
import {JigState} from "./jig-state.js"
import {VM} from "./vm.js";
import {AuthCheck, LockType, Prop, WasmInstance, WasmValue} from "./wasm-instance.js";
import {Lock} from "./locks/lock.js";
import {Externref, Internref} from "./memory.js";
import {ClassNode, CodeKind, findClass, findMethod, TypeNode} from '@aldea/compiler/abi'
import {Address, base16, InstructionRef, instructions, Pointer, Tx} from '@aldea/sdk-js';
import {ArgReader, readType, WasmPointer} from "./arg-reader.js";
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
  private affectedJigs: Set<JigRef>

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
    this.affectedJigs = new Set()
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
      if (!this.affectedJigs.has(jigRef)) {
        return
      }
      const location = new Pointer(this.tx.hash, index)
      const origin = jigRef.origin || location
      const serialized = this.serializeJig(jigRef)
      const jigState = new JigState(origin, location , jigRef.classIdx, serialized, jigRef.package.id, jigRef.lock.serialize())
      this.outputs.push(jigState)
    })

    this.wasms = new Map()
    this.jigs = []
    this.statementResults = []
  }

  private serializeJig (jig: JigRef): Uint8Array {
    return jig.package.extractState(jig.ref, jig.classIdx)
  }

  loadModule (moduleId: Uint8Array): WasmInstance {
    const existing = this.wasms.get(base16.encode(moduleId))
    if (existing) { return existing }
    const wasmInstance = this.vm.createWasmInstance(moduleId)
    wasmInstance.setExecution(this)
    this.wasms.set(base16.encode(moduleId), wasmInstance)
    return wasmInstance
  }

  getLoadedModule (pkgId: string): WasmInstance {
    const wasm = this.wasms.get(pkgId)
    if (!wasm) {
      throw new Error(`Package with id ${pkgId} was expected to be loaded but it's not.`)
    }
    return wasm
  }

  findRemoteUtxoHandler (origin: ArrayBuffer): JigRef {
    const jigRef = this.jigs.find(j => Buffer.from(j.originBuf).equals(Buffer.from(origin)))
    if(!jigRef) { throw new Error('should exist')}
    return jigRef
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

  remoteCallHandler (callerInstance: WasmInstance, targetOrigin: Pointer, methodName: string, argBuff: Uint8Array): WasmValue {
    let targetJig = this.jigs.find(j => j.origin.equals(targetOrigin))
    if (!targetJig) {
      targetJig = this.findJigByOrigin(targetOrigin)
    }

    const klassNode = targetJig.package.abi.classByIndex(targetJig.classIdx)
    const method = findMethod(klassNode, methodName, 'could not find method')

    const args = callerInstance.liftArguments(argBuff, method.args)
    this.localCallStartHandler(targetJig, methodName)
    const wasmValue = this.callInstanceMethod(targetJig, methodName, args);
    this.localCallEndHandler()
    return wasmValue
  }

  remoteStaticExecHandler (srcModule: WasmInstance, targetModId: Uint8Array, fnStr: string, argBuffer: Uint8Array): WasmValue {
    const targetMod = this.loadModule(targetModId)

    const [className, methodName] = fnStr.split('_')

    const obj = findClass(targetMod.abi, className, 'could not find object')
    const method = findMethod(obj, methodName, 'could not find method')

    const argReader = new ArgReader(argBuffer)
    const argValues = method.args.map((arg) => {
      const pointer = readType(argReader, arg.type)
      const wasmValue = srcModule.extractValue(pointer, arg.type);
      return wasmValue.value
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
    this.affectedJigs.add(childJigRef)
  }

  localCallStartHandler(targetJig: JigRef, fnName: string) {
    if (!targetJig.lock.acceptsExecution(this)) {
      const stackTop = this.stackTop()
      if (stackTop) {
        throw new PermissionError(`jig ${targetJig.origin.toString()} is not allowed to exec "${fnName}" called from ${this.stackTop().toString()}${targetJig.lock.constructor === FrozenLock ? " because it's frozen" : ""}`)
      } else {
        throw new PermissionError(`jig ${targetJig.origin.toString()} is not allowed to exec "${fnName}"${targetJig.lock.constructor === FrozenLock ? " because it's frozen" : ""}`)
      }
    }
    this.affectedJigs.add(targetJig)
    this.stack.push(targetJig.origin)
  }

  localCallEndHandler () {
    this.stack.pop()
  }


  remoteAuthCheckHandler (callerOrigin: Pointer, check: AuthCheck): boolean {
    const jigRef = this.jigs.find(jigR => jigR.origin.equals(callerOrigin))
    if (!jigRef) {
      throw new Error('jig ref should exists')
    }
    if (check === AuthCheck.CALL) {
      return jigRef.lock.acceptsExecution(this)
    } else {
      return jigRef.lock.acceptsChangeFrom(callerOrigin, this)
    }
  }

  findUtxoHandler(wasm: WasmInstance, jigPtr: number): JigRef {
    const jigRef = this.jigs.find(ref => ref.package === wasm && ref.ref.ptr === jigPtr)
    if (!jigRef) {
      throw new Error('jig ref should be present')
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
        this.importModule(inst.pkgId)
      } else if (inst instanceof instructions.NewInstruction) {
        const wasm = this.getStatementResult(inst.idx).instance
        const className = wasm.abi.exports[inst.exportIdx].code.name
        this.instantiate(inst.idx, className, this.parseArgs(inst.args))
      } else if (inst instanceof instructions.CallInstruction) {
        const jig = this.getStatementResult(inst.idx).asJig()
        const classNode = jig.package.abi.exports[jig.classIdx].code as ClassNode
        const methodName = classNode.methods[inst.methodIdx].name
        this.callInstanceMethodByIndex(inst.idx, methodName, this.parseArgs(inst.args))
      } else if (inst instanceof instructions.ExecInstruction) {
        const wasm = this.getStatementResult(inst.idx).instance
        const exportNode = wasm.abi.exports[inst.exportIdx]
        if (exportNode.kind !== CodeKind.CLASS) { throw new Error('not a class')}
        const klassNode = exportNode.code as ClassNode
        const methodNode = klassNode.methods[inst.methodIdx]
        this.execStaticMethodByIndex(inst.idx, exportNode.code.name, methodNode.name, this.parseArgs(inst.args))
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
        const coinJig = this.getStatementResult(inst.idx).asJig()
        const amount = coinJig.package.getPropValue(coinJig.ref, coinJig.classIdx, 'motos').value
        if(amount < 100) throw new ExecutionError('not enough coins to fund the transaction')
        coinJig.changeLock(new FrozenLock())
        this.affectedJigs.add(coinJig)
        this.markAsFunded()
      } else {
        throw new ExecutionError(`unknown instruction: ${inst.opcode}`)
      }
      i++
    }
    this.finalize()
  }

  findJigByOutputId (outputId: Uint8Array): JigRef {
    const jigState = this.vm.findJigStateByOutputId(outputId)
    const existing = this.jigs.find(j => j.origin.equals(jigState.origin))
    if (existing) {
      return existing
    }
    return this.hydrateJigState(jigState)
  }

  private parseArgs(args: any[]) {
    return args.map(arg => {
      if (arg instanceof InstructionRef) {
        return this.getStatementResult(arg.idx).asJig()
      } else if (Array.isArray(arg) && arg.length > 0 && arg[0] instanceof InstructionRef) {
        return arg.map(instRef => this.getStatementResult(instRef.idx).asJig())
      } else {
        return arg
      }
    });
  }

  findJigByOrigin (origin: Pointer): JigRef {
    const existing = this.jigs.find(j => j.origin.equals(origin))
    if (existing) {
      return existing
    }
    const jigState = this.vm.findJigStateByOrigin(origin)
    return this.hydrateJigState(jigState)
  }

  findJigByRef (ref: Internref): JigRef {
    const existing = this.jigs.find(j => j.ref.equals(ref))
    if (!existing) {
      throw new Error('should exist')
    }
    return existing
  }

  findJigByPtr (ptr: WasmPointer, instance: WasmInstance): JigRef {
    const existing = this.jigs.find(j => j.ref.ptr === ptr && j.package === instance)
    if (!existing) {
      throw new Error('should exist')
    }
    return existing
  }

  private hydrateJigState(state: JigState): JigRef {
    const module = this.loadModule(state.packageId)
    const ref = module.hidrate(state.classIdx, state)
    const lock = this.hidrateLock(state.serializedLock)
    const jigRef = new JigRef(ref, state.classIdx, module, state.origin, state.currentLocation, lock)
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
    if (!jigRef) { throw new Error('jig should had been created created')}
    this.affectedJigs.add(jigRef)

    this.statementResults.push(new ValueStatementResult(result.node, jigRef, result.mod))
    return this.statementResults.length - 1
  }

  callInstanceMethod (jig: JigRef, methodName: string, args: any[]): WasmValue {
    const methodResult = jig.package.instanceCall(jig, jig.className(), methodName, args);
    this.affectedJigs.add(jig)
    let value = methodResult.value

    if (value instanceof Internref) {
      const jigData = methodResult.mod.liftBasicJig(value)
      const origin = Pointer.fromBytes(jigData.$output.origin)
      value = this.findJigByOrigin(origin)
    }
    if (value instanceof Externref) {
      const pointer = Pointer.fromBytes(value.originBuf)
      value = this.getJigRefByOrigin(pointer)
    }
    return {...methodResult, value}
  }

  callInstanceMethodByIndex (jigIndex: number, methodName: string, args: any[]): number {
    const jigRef = this.getStatementResult(jigIndex).asJig()
    this.localCallStartHandler(jigRef, methodName)
    const methodResult = this.callInstanceMethod(jigRef, methodName, args)
    this.localCallEndHandler()
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
      const jigData = mod.liftBasicJig(value)
      const origin = Pointer.fromBytes(jigData.$output.origin)
      value = this.findJigByOrigin(origin)
    }
    if (value instanceof Externref) {
      const pointer = Pointer.fromBytes(value.originBuf)
      value = this.getJigRefByOrigin(pointer)
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

  execExportedFnByIndex (moduleIndex: number, fnName: string, args: any[]): number {
    const wasm = this.getStatementResult(moduleIndex).instance

    let {node, value, mod} = wasm.functionCall(fnName, args)

    if (value instanceof Internref) {
      const jigData = mod.liftBasicJig(value)
      const origin = Pointer.fromBytes(jigData.$output.origin)
      value = this.findJigByOrigin(origin)
    }
    if (value instanceof Externref) {
      const pointer = Pointer.fromBytes(value.originBuf)
      value = this.getJigRefByOrigin(pointer)
    }

    const newStatementResult = new ValueStatementResult(
      node,
      value,
      mod
    )

    this.statementResults.push(newStatementResult)
    return this.statementResults.length - 1
  }


  createNextOrigin () {
    return new Pointer(this.tx.hash, this.jigs.length)
  }

  stackTop () {
    return this.stack[this.stack.length - 1]
  }

  stackPreviousToTop (): null | Pointer {
    if (this.stack.length < 2) {
      return null
    }
    return this.stack[this.stack.length - 2]
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
    jigRef.changeLock(new UserLock(address))
    jigRef.writeField('$lock', {origin: jigRef.origin.toBytes(), ...jigRef.lock.serialize()})
    this.affectedJigs.add(jigRef)
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

  outputIndexFor(jigRef: JigRef): number {
    return this.jigs.findIndex(j => j === jigRef)
  }

  jigByInternRef(ref: Internref): JigRef {
    const jig = this.jigs.find((j: JigRef) => j.ref.equals(ref))
    if (!jig) {
      throw new Error('jig should exist')
    }
    return jig
  }
}

export { TxExecution }
