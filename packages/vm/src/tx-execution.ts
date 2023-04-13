import {JigLock} from "./locks/jig-lock.js"
import {JigRef} from "./jig-ref.js"
import {ExecutionError, PermissionError} from "./errors.js"
import {UserLock} from "./locks/user-lock.js"
import {NoLock} from "./locks/no-lock.js"
import {JigState} from "./jig-state.js"
import {AuthCheck, LockType, Prop, WasmInstance, WasmValue} from "./wasm-instance.js";
import {Lock} from "./locks/lock.js";
import {ClassNode, CodeKind} from '@aldea/compiler/abi'
import {Address, base16, InstructionRef, instructions, Pointer} from '@aldea/sdk-js';
import {PublicLock} from "./locks/public-lock.js";
import {FrozenLock} from "./locks/frozen-lock.js";
import {emptyTn} from "./abi-helpers/well-known-abi-nodes.js";
import {ExecutionResult, PackageDeploy} from "./execution-result.js";
import {EmptyStatementResult, StatementResult, ValueStatementResult, WasmStatementResult} from "./statement-result.js";
import {TxContext} from "./tx-context/tx-context.js";
import {PkgData} from "./storage.js";

class TxExecution {
  txContext: TxContext;
  private jigs: JigRef[];
  private wasms: Map<string, WasmInstance>;
  private readonly stack: Pointer[];
  deployments: PkgData[];
  statements: StatementResult[]
  private funded: boolean;
  private affectedJigs: JigRef[]

  constructor(context: TxContext) {
    this.txContext = context
    this.jigs = []
    this.wasms = new Map()
    this.stack = []
    this.statements = []
    this.funded = false
    this.deployments = []
    this.affectedJigs = []
  }

  finalize(): ExecutionResult {
    const result = new ExecutionResult(this.txContext.tx)
    if (!this.funded) {
      throw new ExecutionError('tx not funded')
    }
    this.jigs.forEach(jigRef => {
      if (jigRef.lock.isOpen()) {
        throw new PermissionError(`unlocked jig (${jigRef.className()}): ${jigRef.origin}`)
      }
    })

    this.affectedJigs.forEach((jigRef, index) => {
      const origin = jigRef.origin
      const location = new Pointer(this.txContext.txHash(), index)
      const serialized = this.serializeJig(jigRef)
      const jigState = new JigState(
        origin,
        location,
        jigRef.classIdx,
        serialized,
        jigRef.package.id,
        jigRef.lock,
        this.txContext.now().unix()
      )
      result.addOutput(jigState)
    })

    this.deployments.forEach(pkgData => {
      result.addDeploy(new PackageDeploy(
        pkgData.sources,
        pkgData.entries,
        pkgData.wasmBin,
        pkgData.abi,
        pkgData.docs
      ))
    })

    this.wasms = new Map()
    this.jigs = []
    this.statements = []
    result.finish(this.txContext.now())
    return result
  }

  private serializeJig(jig: JigRef): Uint8Array {
    return jig.package.extractState(jig.ref, jig.classIdx)
  }

  loadModule(moduleId: Uint8Array): WasmInstance {
    const existing = this.wasms.get(base16.encode(moduleId))
    if (existing) {
      return existing
    }
    const wasmInstance = this.txContext.wasmFromPkgId(moduleId)
    wasmInstance.setExecution(this)
    this.wasms.set(base16.encode(moduleId), wasmInstance)
    return wasmInstance
  }

  getLoadedModule(pkgId: string): WasmInstance {
    const wasm = this.wasms.get(pkgId)
    if (!wasm) {
      throw new Error(`Package with id ${pkgId} was expected to be loaded but it's not.`)
    }
    return wasm
  }

  findRemoteUtxoHandler(origin: ArrayBuffer): JigRef {
    const jigRef = this.jigs.find(j => Buffer.from(j.originBuf).equals(Buffer.from(origin)))
    if (!jigRef) {
      throw new Error('should exist')
    }
    return jigRef
  }

  remoteCallHandler(callerInstance: WasmInstance, targetOrigin: Pointer, methodName: string, argBuff: Uint8Array): WasmValue {
    let targetJig = this.jigs.find(j => j.origin.equals(targetOrigin))
    if (!targetJig) {
      targetJig = this.findJigByOrigin(targetOrigin)
    }

    const klassNode = targetJig.package.abi.classByIndex(targetJig.classIdx)
    const method = klassNode.methodByName(methodName)

    const args = callerInstance.liftArguments(argBuff, method.args)
    this.localCallStartHandler(targetJig, method.name)
    const result = targetJig.package.instanceCall(targetJig, method, args);
    this.localCallEndHandler()
    return result
  }

  remoteStaticExecHandler(srcModule: WasmInstance, targetModId: Uint8Array, fnStr: string, argBuffer: Uint8Array): WasmValue {
    const targetMod = this.loadModule(targetModId)

    const [className, methodName] = fnStr.split('_')

    const obj = targetMod.abi.classByName(className)
    const method = obj.methodByName(methodName)

    const argValues = srcModule.liftArguments(argBuffer, method.args)

    return targetMod.staticCall(method, argValues)
  }

  getPropHandler(origin: Pointer, propName: string): Prop {
    let jig = this.jigs.find(j => j.origin.equals(origin))
    if (!jig) {
      jig = this.findJigByOrigin(origin)
    }
    return jig.package.getPropValue(jig.ref, jig.classIdx, propName)
  }

  remoteLockHandler(childOrigin: Pointer, type: LockType, extraArg: ArrayBuffer): void {
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
    this.marKJigAsAffected(childJigRef)
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
    this.marKJigAsAffected(targetJig)
    this.stack.push(targetJig.origin)
  }

  localCallEndHandler() {
    this.stack.pop()
  }


  remoteAuthCheckHandler(callerOrigin: Pointer, check: AuthCheck): boolean {
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

  getJigRefByOrigin(origin: Pointer): JigRef {
    const jigRef = this.jigs.find(jr => jr.origin.equals(origin));
    if (!jigRef) {
      throw new Error('does not exists')
    }
    return jigRef
  }

  addNewJigRef(jigRef: JigRef): JigRef {
    this.jigs.push(jigRef)
    return jigRef
  }

  linkJig(jigRef: JigRef): void {
    this.addNewJigRef(jigRef)
    this.marKJigAsAffected(jigRef)
  }

  async run(): Promise<ExecutionResult> {
    await this.txContext.forEachInstruction(async inst => {
      if (inst instanceof instructions.ImportInstruction) {
        this.importModule(inst.pkgId)
      } else if (inst instanceof instructions.NewInstruction) {
        this.instantiateByIndex(inst.idx, inst.exportIdx, this.parseArgs(inst.args))
      } else if (inst instanceof instructions.CallInstruction) {
        this.callInstanceMethodByIndex(inst.idx, inst.methodIdx, this.parseArgs(inst.args))
      } else if (inst instanceof instructions.ExecInstruction) {
        const wasm = this.getStatementResult(inst.idx).asInstance
        const exportNode = wasm.abi.exports[inst.exportIdx]
        if (exportNode.kind !== CodeKind.CLASS) {
          throw new Error('not a class')
        }
        const klassNode = exportNode.code as ClassNode
        const methodNode = klassNode.methods[inst.methodIdx]
        this.execStaticMethodByIndex(inst.idx, exportNode.code.name, methodNode.name, this.parseArgs(inst.args))
      } else if (inst instanceof instructions.LockInstruction) {
        this.lockJigToUserByIndex(inst.idx, new Address(inst.pubkeyHash))
      } else if (inst instanceof instructions.LoadInstruction) {
        this.loadJigByOutputId(inst.outputId)
      } else if (inst instanceof instructions.LoadByOriginInstruction) {
        this.loadJigByOrigin(Pointer.fromBytes(inst.origin))
      } else if (inst instanceof instructions.SignInstruction) {
        this.statements.push(new EmptyStatementResult(this.statements.length))
      } else if (inst instanceof instructions.SignToInstruction) {
        this.statements.push(new EmptyStatementResult(this.statements.length))
      } else if (inst instanceof instructions.DeployInstruction) {
        await this.deployPackage(inst.entry, inst.code)
      } else if (inst instanceof instructions.FundInstruction) {
        this.fundByIndex(inst.idx)
      } else {
        throw new ExecutionError(`unknown instruction: ${inst.opcode}`)
      }
    })
    return this.finalize()
  }

  fundByIndex(coinIdx: number): void {
    const coinJig = this.getStatementResult(coinIdx).asJig()
    const amount = coinJig.package.getPropValue(coinJig.ref, coinJig.classIdx, 'motos').value
    if (amount < 100) throw new ExecutionError('not enough coins to fund the transaction')
    coinJig.changeLock(new FrozenLock())
    this.marKJigAsAffected(coinJig)
    this.markAsFunded()
  }

  findJigByOutputId(outputId: Uint8Array): JigRef {
    const jigState = this.txContext.stateByOutputId(outputId)
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

  findJigByOrigin(origin: Pointer): JigRef {
    const existing = this.jigs.find(j => j.origin.equals(origin))
    if (existing) {
      return existing
    }
    const jigState = this.txContext.stateByOrigin(origin)
    return this.hydrateJigState(jigState)
  }

  private hydrateJigState(state: JigState): JigRef {
    const module = this.loadModule(state.packageId)
    const ref = module.hidrate(state.classIdx, state)
    const lock = this.hydrateLock(state.serializedLock)
    const jigRef = new JigRef(ref, state.classIdx, module, state.origin, state.currentLocation, lock)
    this.addNewJigRef(jigRef)
    return jigRef
  }

  loadJigByOutputId(outputId: Uint8Array): StatementResult {
    const jigRef = this.findJigByOutputId(outputId)
    const typeNode = emptyTn(jigRef.className())
    const ret = new ValueStatementResult(this.statements.length, typeNode, jigRef, jigRef.package);
    this.statements.push(ret)
    return ret
  }

  loadJigByOrigin(origin: Pointer): StatementResult {
    const jigRef = this.findJigByOrigin(origin)
    const typeNode = emptyTn(jigRef.className())
    const ret = new ValueStatementResult(this.statements.length, typeNode, jigRef, jigRef.package);
    this.statements.push(ret)
    return ret
  }

  private hydrateLock(frozenLock: any): Lock {
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

  instantiate(wasm: WasmInstance, className: string, args: any[]): WasmValue {
    const method =  wasm.abi.classByName(className).methodByName('constructor')
    this.stack.push(this.createNextOrigin())
    const result = wasm.staticCall(method, args)
    this.stack.pop()
    const jigRef = this.jigs.find(j => j.package === wasm && j.ref.ptr === result.value.ptr)
    if (!jigRef) {
      throw new Error('jig should had been created created')
    }
    this.marKJigAsAffected(jigRef)
    return {
      ...result,
      node: emptyTn(className),
      value: jigRef
    }

    //
    // const ret = new ValueStatementResult(result.node, jigRef, result.mod);
    // this.statementResults.push(ret)
    // return ret
  }

  instantiateByIndex(statementIndex: number, classIdx: number, args: any[]): StatementResult {
    const statement = this.statements[statementIndex]
    const instance = statement.asInstance
    const classNode = instance.abi.classByIndex(classIdx)
    const wasmValue = this.instantiate(instance, classNode.name, args)

    const ret = new ValueStatementResult(this.statements.length, wasmValue.node, wasmValue.value, wasmValue.mod);
    this.statements.push(ret)
    return ret
  }

  instantiateByClassName(wasm: WasmInstance, className: string, args: any[]): StatementResult {
    const knownWasm = this.wasms.get(base16.encode(wasm.id))
    if (wasm !== knownWasm) {
      throw new Error('wasm instance does not belong to current execution')
    }

    const wasmValue = this.instantiate(wasm, className, args)

    const ret = new ValueStatementResult(this.statements.length, wasmValue.node, wasmValue.value, wasmValue.mod);
    this.statements.push(ret)
    return ret
  }

  callInstanceMethod(jig: JigRef, methodName: string, args: any[]): StatementResult {
    if (!this.jigs.includes(jig)) {
      throw new ExecutionError(`the jig does not belong to the current tx`)
    }
    const method = jig.classAbi().methodByName(methodName)

    this.localCallStartHandler(jig, methodName)
    const methodResult = jig.package.instanceCall(jig, method, args);
    this.localCallEndHandler()
    const ret = new ValueStatementResult(this.statements.length, methodResult.node, methodResult.value, methodResult.mod)
    this.statements.push(ret)
    return ret
  }

  callInstanceMethodByIndex(jigIndex: number, methodIdx: number, args: any[]): StatementResult {
    const jigRef = this.getStatementResult(jigIndex).asJig()
    const method = jigRef.classAbi().methodByIdx(methodIdx)
    this.localCallStartHandler(jigRef, method.name)
    const methodResult = jigRef.package.instanceCall(jigRef, method, args)
    this.localCallEndHandler()
    const ret = new ValueStatementResult(this.statements.length, methodResult.node, methodResult.value, methodResult.mod)
    this.statements.push(ret)
    return ret
  }

  execStaticMethod(wasm: WasmInstance, className: string, methodName: string, args: any[]): ValueStatementResult {
    const method = wasm.abi.classByName(className).methodByName(methodName)

    let {node, value, mod} = wasm.staticCall(method, args)
    const ret = new ValueStatementResult(
      this.statements.length,
      node,
      value,
      mod
    )

    this.statements.push(ret)
    return ret
  }

  execStaticMethodByIndex(moduleIndex: number, className: string, methodName: string, args: any[]): number {
    const wasm = this.getStatementResult(moduleIndex).asInstance
    this.execStaticMethod(wasm, className, methodName, args)
    return this.statements.length - 1
  }

  execExportedFnByIndex(moduleIndex: number, fnIdx: number, args: any[]): StatementResult {
    const wasm = this.getStatementResult(moduleIndex).asInstance
    const fnNode = wasm.abi.functionByIdx(fnIdx)

    let {node, value, mod} = wasm.functionCall(fnNode, args)

    const ret = new ValueStatementResult(
      this.statements.length,
      node,
      value,
      mod
    )

    this.statements.push(ret)
    return ret
  }

  execExportedFnByName(wasm: WasmInstance, fnName: string, args: any[]): StatementResult {
    const fnNode = wasm.abi.functionByName(fnName)
    let {node, value, mod} = wasm.functionCall(fnNode, args)

    const ret = new ValueStatementResult(
      this.statements.length,
      node,
      value,
      mod
    )

    this.statements.push(ret)
    return ret
  }


  createNextOrigin() {
    return new Pointer(this.txContext.txHash(), this.affectedJigs.length)
  }

  stackTop() {
    return this.stack[this.stack.length - 1]
  }

  stackPreviousToTop(): null | Pointer {
    if (this.stack.length < 2) {
      return null
    }
    return this.stack[this.stack.length - 2]
  }


  getStatementResult(index: number): StatementResult {
    const result = this.statements[index]
    if (!result) {
      throw new ExecutionError(`undefined index: ${index}`)
    }
    return result
  }

  lockJigToUser(jigRef: JigRef, address: Address): StatementResult {
    if (!jigRef.lock.canBeChangedBy(this)) {
      throw new PermissionError(`no permission to remove lock from jig ${jigRef.origin}`)
    }
    jigRef.changeLock(new UserLock(address))
    jigRef.writeField('$lock', {origin: jigRef.origin.toBytes(), ...jigRef.lock.serialize()})
    this.marKJigAsAffected(jigRef)

    const ret = new EmptyStatementResult(this.statements.length);
    this.statements.push(ret)
    return ret
  }

  lockJigToUserByIndex(jigIndex: number, address: Address): StatementResult {
    const jigRef = this.getStatementResult(jigIndex).asJig()
    return this.lockJigToUser(jigRef, address)
  }

  importModule(modId: Uint8Array): StatementResult {
    const instance = this.loadModule(modId)
    const ret = new WasmStatementResult(this.statements.length, instance);
    this.statements.push(ret)
    return ret
  }

  async deployPackage(entryPoint: string[], sources: Map<string, string>): Promise<StatementResult> {
    const pkgData = await this.txContext.compile(entryPoint, sources)
    this.deployments.push(pkgData)
    const wasm = this.txContext.getWasmInstance(pkgData)
    wasm.setExecution(this)
    this.wasms.set(base16.encode(wasm.id), wasm)
    const ret = new WasmStatementResult(this.statements.length, wasm)
    this.statements.push(ret)
    return ret
  }

  markAsFunded() {
    this.funded = true
  }

  signedBy(addr: Address) {
    return this.txContext.tx.isSignedBy(addr, this.execLength())
  }

  private execLength() {
    return this.statements.length
  }

  private marKJigAsAffected(jig: JigRef): void {
    const exists = this.affectedJigs.find(affectedJig => affectedJig.origin.equals(jig.origin))
    if (!exists) {
      this.affectedJigs.push(jig)
    }
  }
}

export {TxExecution}