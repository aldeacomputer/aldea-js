import {ContainerRef, JigRef} from "./jig-ref.js"
import {ExecutionError, IvariantBroken} from "./errors.js"
import {OpenLock} from "./locks/open-lock.js"
import {AuthCheck, WasmContainer} from "./wasm-container.js";
import {Address, base16, BufReader, BufWriter, Lock as CoreLock, LockType, Output, Pointer} from '@aldea/core';
import {COIN_CLS_PTR, outputTypeNode} from "./memory/well-known-abi-nodes.js";
import {ExecutionResult, PackageDeploy} from "./execution-result.js";
import {EmptyStatementResult, StatementResult, ValueStatementResult, WasmStatementResult} from "./statement-result.js";
import {ExecContext} from "./tx-context/exec-context.js";
import {PkgData} from "./storage.js";
import {JigData} from "./memory/lower-value.js";
import {Option} from "./support/option.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {serializeOutput, serializePointer} from "./memory/serialize-output.js";
import {fromCoreLock} from "./locks/from-core-lock.js";
import {AddressLock} from "./locks/address-lock.js";
import {FrozenLock} from "./locks/frozen-lock.js";
import {AbiMethod} from "./memory/abi-helpers/abi-method.js";
import {JigInitParams} from "./jig-init-params.js";
import {ArgsTranslator} from "./args-translator.js";
import {CodeKind} from "@aldea/core/abi";
import {AbiArg} from "./memory/abi-helpers/abi-arg.js";
import {ExecOpts} from "./export-opts.js";

export const MIN_FUND_AMOUNT = 100

export class DiscretCounter {
  private tag: string;
  private total: bigint
  private count: bigint
  private hydroSize: bigint
  hydros: bigint
  private maxHydros: bigint;

  constructor (tag: string, hydroSize: bigint, maxHydros: bigint) {
    this.tag = tag
    this.total = 0n
    this.count = 0n
    this.hydros = 0n
    this.hydroSize = hydroSize
    this.maxHydros = maxHydros
  }

  add(amount: bigint) {
    this.total += amount
    this.count += amount
    const newHydros = this.count / this.hydroSize
    this.hydros += newHydros
    this.count = this.count % this.hydroSize

    if (this.hydros > this.maxHydros) {
      throw new ExecutionError(`Max hydros for ${this.tag} (${this.maxHydros}) was over passed`)
    }
  }

  clear (): number {
    let res = Number(this.hydros)
    if (this.count > 0n) {
      res +=1
    }
    this.total = 0n
    this.count = 0n
    this.hydros = 0n
    return res
  }
}


export class Measurements {
  movedData: DiscretCounter;
  wasmExecuted: DiscretCounter;
  numContainers: DiscretCounter;
  numSigs: DiscretCounter;
  originChecks: DiscretCounter

  constructor (opts: ExecOpts) {
    this.movedData = new DiscretCounter('Moved Data', opts.moveDataHydroSize, opts.moveDataMaxHydros)
    this.wasmExecuted = new DiscretCounter('Raw Execution', opts.wasmExecutionHydroSize, opts.wasmExecutionMaxHydros)
    this.numContainers = new DiscretCounter('Num Containers', opts.numContHydroSize, opts.numContMaxHydros)
    this.numSigs = new DiscretCounter('Num Sigs', opts.numSigsHydroSize, opts.numSigsMaxHydros)
    this.originChecks = new DiscretCounter('Load By Origin', opts.originCheckHydroSize, opts.originCheckMaxHydros)
  }

  clear () {
    return this.movedData.clear() +
        this.wasmExecuted.clear() +
        this.numContainers.clear() +
        this.numSigs.clear() +
        this.originChecks.clear();
  }
}

class TxExecution {
  execContext: ExecContext;
  private jigs: JigRef[];
  private wasms: Map<string, WasmContainer>;
  private readonly stack: Pointer[];
  deployments: PkgData[];
  statements: StatementResult[]
  private fundAmount: number;
  private affectedJigs: JigRef[]
  private nextOrigin: Option<Pointer>
  // private opts: ExecOpts
  private measurements: Measurements;

  constructor (context: ExecContext, opts: ExecOpts) {
    this.execContext = context
    this.jigs = []
    this.wasms = new Map()
    this.stack = []
    this.statements = []
    this.fundAmount = 0
    this.deployments = []
    this.affectedJigs = []
    this.nextOrigin = Option.none()
    // this.opts = opts
    this.measurements = new Measurements(opts)
    this.measurements.numSigs.add(BigInt(this.execContext.signers().length))
  }

  finalize (): ExecutionResult {
    const result = new ExecutionResult(this.execContext.txId())
    if (this.fundAmount < MIN_FUND_AMOUNT) {
      throw new ExecutionError(`Not enough funding. Provided: ${this.fundAmount}. Needed: ${MIN_FUND_AMOUNT}`)
    }
    // this.jigs.forEach(jigRef => {
    //   if (jigRef.lock.isOpen()) {
    //     throw new PermissionError(`Finishing tx with unlocked jig (${jigRef.className()}): ${jigRef.origin}`)
    //   }
    // })
    //
    this.affectedJigs.forEach((jigRef, index) => {
      const origin = jigRef.origin
      const location = new Pointer(this.execContext.txHash(), index)
      const jigProps = jigRef.extractProps()
      const jigState = new Output(
        origin,
        location,
        jigRef.classPtr(),
        jigRef.lock.coreLock(),
        jigProps,
        jigRef.ref.container.abi.abi
      )
      result.addOutput(jigState)

      if (!jigRef.isNew) {
        result.addSpend(this.execContext.inputByOrigin(jigRef.origin))
      }
    })

    this.jigs.forEach(jig => {
      if (!this.affectedJigs.includes(jig)) {
        result.addRead(this.execContext.inputByOrigin(jig.origin))
      }
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

    for (const wasm of this.wasms.values()) {
      wasm.clearExecution()
    }
    this.wasms = new Map()
    this.jigs = []
    this.statements = []
    result.setHydrosUsed(this.measurements.clear())
    result.finish()
    return result
  }

  /**
   * Opcodes
   */

  fund (coinIdx: number): StatementResult {
    const coinJig = this.jigAt(coinIdx)
    if (!coinJig.classPtr().equals(COIN_CLS_PTR)) {
      throw new ExecutionError(`Not a coin: ${coinJig.origin}`)
    }

    coinJig.lock.assertOpen(this)

    const amount = coinJig.getPropValue('amount').ptr
    this.fundAmount += amount.toUInt()
    coinJig.changeLock(new FrozenLock())
    const stmt = new EmptyStatementResult(this.statements.length)
    this.statements.push(stmt)
    this.marKJigAsAffected(coinJig)
    return stmt
  }

  call (jigIdx: number, methodIdx: number, argsBuf: Uint8Array): StatementResult {
    const jig = this.jigAt(jigIdx)
    jig.lock.assertOpen(this)
    const abiClass = jig.classAbi();
    const method = abiClass.methodByIdx(methodIdx).get()

    const wasm = jig.ref.container;
    const args = this.lowerArgs(wasm, method.args, argsBuf);

    this.marKJigAsAffected(jig)
    const res = this.performMethodCall(jig, method, args)

    let stmt: StatementResult = res.map<StatementResult>(ref => {
      return new ValueStatementResult(this.statements.length, ref.ty, ref.ptr, ref.container)
    }).orElse(() => new EmptyStatementResult(this.statements.length))

    this.statements.push(stmt)
    return stmt
  }

  load (outputId: Uint8Array): StatementResult {
    const output = this.execContext.stateByOutputId(outputId)
    const jigRef = this.hydrate(output)

    const ret = new ValueStatementResult(this.statements.length, jigRef.ref.ty.proxy(), jigRef.ref.ptr, jigRef.ref.container);
    this.statements.push(ret)
    return ret
  }

  loadByOrigin (originBytes: Uint8Array): StatementResult {
    this.measurements.originChecks.add(1n)
    const origin = Pointer.fromBytes(originBytes)
    const output = this.execContext.inputByOrigin(origin)
    const jigRef = this.hydrate(output)
    const stmt = new ValueStatementResult(this.statements.length, jigRef.ref.ty.proxy(), jigRef.ref.ptr, jigRef.ref.container)
    this.statements.push(stmt)
    return stmt
  }

  instantiate (statementIndex: number, classIdx: number, argsBuf: Uint8Array): StatementResult {
    const statement = this.statements[statementIndex]
    const wasm = statement.asContainer()

    const classNode = wasm.abi.exportedByIdx(classIdx).get().toAbiClass()

    const method = wasm.abi.exportedByName(classNode.name).get().toAbiClass().constructorDef()
    const callArgs = this.lowerArgs(wasm, method.args, argsBuf)

    const nextOrigin = this.createNextOrigin()
    this.nextOrigin = Option.some(nextOrigin)
    this.stack.push(nextOrigin)
    const result = wasm
      .callFn(method.callName(), callArgs, method.args.map(arg => arg.type))
      .get()
    this.stack.pop()

    const jigRef = this.jigs.find(j => j.package === wasm && j.ref.ptr.equals(result))
    if (!jigRef) {
      throw new Error('jig should had been created created')
    }

    const ret = new ValueStatementResult(this.statements.length, method.rtype, result, wasm);
    this.statements.push(ret)
    return ret
  }

  exec (wasmIdx: number, fnIdx: number, argsBuf: Uint8Array): StatementResult {
    const wasm = this.statements[wasmIdx].asContainer()
    const fn = wasm.abi.exportedByIdx(fnIdx).get().toAbiFunction()
    const args = this.lowerArgs(wasm, fn.args, argsBuf)

    const value = wasm.callFn(fn.name, args, fn.args.map(a => a.type))

    const stmt = value.map<StatementResult>(ptr =>
      new ValueStatementResult(this.statements.length, fn.rtype, ptr, wasm)
    ).orDefault(new EmptyStatementResult(this.statements.length))

    this.statements.push(stmt)

    return stmt
  }

  sign (_sig: Uint8Array, _pubKey: Uint8Array): StatementResult {
    const stmt = new EmptyStatementResult(this.statements.length);
    this.statements.push(stmt)
    return stmt
  }

  signTo (_sig: Uint8Array, _pubKey: Uint8Array): StatementResult {
    const stmt = new EmptyStatementResult(this.statements.length);
    this.statements.push(stmt)
    return stmt
  }

  private hydrate (output: Output): JigRef {
    const existing = this.jigs.find(j => j.origin.equals(output.origin))
    if (existing) return existing

    const container = this.assertContainer(output.classPtr.id)
    const classAbi = container.abi.exportedByIdx(output.classPtr.idx).get().toAbiClass()

    const ptr = container.low.lower(serializeOutput(output), classAbi.ownTy())

    const newJigRef = new JigRef(
      new ContainerRef(
        ptr,
        classAbi.ownTy(),
        container
      ),
      output.classPtr.idx,
      output.origin,
      output.location,
      fromCoreLock(output.lock),
      false
    )

    this.jigs.push(newJigRef)
    return newJigRef
  }

  private lowerArgs (wasm: WasmContainer, args: AbiArg[], rawArgs: Uint8Array): WasmWord[] {
    const fixer = new ArgsTranslator(this, wasm.abi)
    const argsBuf = fixer.fix(rawArgs, args)

    const reader = new BufReader(argsBuf)

    return args.map((arg) => {
      return wasm.low.lowerFromReader(reader, arg.type)
    })
  }

  private performMethodCall (jig: JigRef, method: AbiMethod, loweredArgs: WasmWord[]): Option<ContainerRef> {
    const wasm = jig.ref.container
    const abiClass = jig.classAbi()
    this.stack.push(jig.origin)
    const res = wasm.callFn(
      method.callName(),
      [jig.ref.ptr, ...loweredArgs],
      [abiClass.ownTy(), ...method.args.map(a => a.type)]
    )
    this.stack.pop()
    return res.map((ptr) => {
      return new ContainerRef(ptr, method.rtype, wasm)
    })
  }

  createNextOrigin () {
    return new Pointer(this.execContext.txHash(), this.affectedJigs.length)
  }

  stmtAt (index: number): StatementResult {
    const result = this.statements[index]
    if (!result) {
      throw new ExecutionError(`undefined index: ${index}`)
    }
    return result
  }

  private lockJigToUser (jigRef: JigRef, address: Address): StatementResult {
    jigRef.lock.assertOpen(this)
    this.marKJigAsAffected(jigRef)
    jigRef.changeLock(new AddressLock(address))
    const ret = new EmptyStatementResult(this.statements.length);
    this.statements.push(ret)
    return ret
  }

  private jigAt (jigIndex: number): JigRef {
    const ref = this.stmtAt(jigIndex).asValue()
    ref.container.abi.exportedByName(ref.ty.name)
      .filter(e => e.kind === CodeKind.CLASS)
      .map(e => e.toAbiClass())
      .expect(new ExecutionError(`index ${jigIndex} is not a jig`))

    const lifted = Pointer.fromBytes(ref.lift())

    return Option.fromNullable(this.jigs.find(j => j.origin.equals(lifted)))
      .expect(new IvariantBroken('Lowered jig is not in jig list'))
  }

  lockJig (jigIndex: number, address: Address): StatementResult {
    const jigRef = this.jigAt(jigIndex)
    return this.lockJigToUser(jigRef, address)
  }

  async deploy (entryPoint: string[], sources: Map<string, string>): Promise<StatementResult> {
    const pkgData = await this.execContext.compile(entryPoint, sources)
    this.deployments.push(pkgData)
    const wasm = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    wasm.setExecution(this)
    this.wasms.set(base16.encode(wasm.hash), wasm)
    const ret = new WasmStatementResult(this.statements.length, wasm)
    this.statements.push(ret)
    return ret
  }

  private assertContainer (modId: string): WasmContainer {
    const existing = this.wasms.get(modId)
    if (existing) {
      return existing
    }

    const container = this.execContext.wasmFromPkgId(modId)
    container.setExecution(this)
    this.wasms.set(container.id, container)
    this.measurements.numContainers.add(1n)
    return container
  }

  import (modId: Uint8Array): StatementResult {
    const instance = this.assertContainer(base16.encode(modId))
    const ret = new WasmStatementResult(this.statements.length, instance);
    this.statements.push(ret)
    return ret
  }

  signedBy (addr: Address): boolean {
    return this.execContext.signers()
      .some(s => s.toAddress().equals(addr))
  }

  execLength () {
    return this.statements.length
  }

  private marKJigAsAffected (jig: JigRef): void {
    const exists = this.affectedJigs.find(affectedJig => affectedJig.origin.equals(jig.origin))
    if (!exists) {
      this.affectedJigs.push(jig)
    }
  }

  getJigData (p: Pointer): Option<JigData> {
    const existing = this.jigs.find(j => j.origin.equals(p))
    if (existing) {
      return Option.some({
        origin: existing.origin,
        location: existing.latestLocation,
        classPtr: existing.classPtr(),
        lock: existing.lock
      })
    }


    const output = this.execContext.inputByOrigin(p)

    return Option.some({
      origin: output.origin,
      location: output.location,
      classPtr: output.classPtr,
      lock: fromCoreLock(output.lock)
    })
  }

  private assertJig (origin: Pointer) {
    return Option.fromNullable(
      this.jigs.find(j => j.origin.equals(origin))
    ).orElse(() => {
      const output = this.execContext.inputByOrigin(origin)
      return this.hydrate(output)
    })
  }

  private liftArgs (from: WasmContainer, ptr: WasmWord, argDef: AbiArg[]): Uint8Array {
    const w = new BufWriter()
    w.writeU8(0)

    const argsBuf = new BufReader(from.liftBuf(ptr))

    for (const arg of argDef) {
      const ptr = WasmWord.fromReader(argsBuf, arg.type)
      const lifted = from.lifter.lift(ptr, arg.type)
      w.writeFixedBytes(lifted)
    }

    return w.data
  }

  stackFromTop (n: number): Option<Pointer> {
    return Option.fromNullable(this.stack[this.stack.length - n])
  }


  // =========
  // Callbacks
  // =========

  // Metering callbacks

  onDataMoved (size: number) {
    this.measurements.movedData.add(BigInt(size))
  }

  // Assemblyscrypt callbacks

  vmJigInit (from: WasmContainer): WasmWord {
    const nextOrigin = this.nextOrigin.get()
    const jigInitParams = new JigInitParams(
      nextOrigin,
      nextOrigin,
      new Pointer(new Uint8Array(32).fill(0xff), 0xffff),
      new OpenLock()
    )
    return jigInitParams.lowerInto(from)
  }

  vmJigLink (from: WasmContainer, jigPtr: WasmWord, rtId: number): WasmWord {
    const nextOrigin = this.nextOrigin.get()
    let rtIdNode = from.abi.rtIdById(rtId)
      .expect(new Error(`Runtime id "${rtId}" not found in ${base16.encode(from.hash)}`))
    const abiClass = from.abi.exportedByName(rtIdNode.name).map(e => e.toAbiClass())
      .expect(new Error(`Class named "${rtIdNode.name}" not found in ${base16.encode(from.hash)}`))

    const newJigRef = new JigRef(
      new ContainerRef(
        jigPtr,
        abiClass.ownTy(),
        from
      ),
      abiClass.idx,
      nextOrigin,
      nextOrigin,
      new OpenLock(),
      true
    )

    this.jigs.push(newJigRef)
    this.marKJigAsAffected(newJigRef)

    return from
      .low
      .lower(
        serializePointer(new Pointer(from.hash, abiClass.idx)),
        AbiType.fromName('ArrayBuffer')
      )
  }

  vmCallMethod (from: WasmContainer, targetPtr: WasmWord, methodNamePtr: WasmWord, argsPtr: WasmWord): WasmWord {
    const targetOrigin = Pointer.fromBytes(from.liftBuf(targetPtr))
    const methodName = from.liftString(methodNamePtr)

    const jig = this.assertJig(targetOrigin)
    jig.lock.assertOpen(this)

    const method = jig.classAbi().methodByName(methodName).get()

    // Move args
    const argBuf = this.liftArgs(from, argsPtr, method.args)
    const loweredArgs = this.lowerArgs(jig.ref.container, method.args, argBuf)
    // const argsReader = new BufReader(argBuf)
    // const loweredArgs = method.args.map(arg => {
    //   return jig.ref.container.low.lowerFromReader(argsReader, arg.type)
    // })

    const methodRes = this.performMethodCall(jig, method, loweredArgs)
    this.marKJigAsAffected(jig)

    return methodRes.map(value => {
      const lifted = value.lift()
      return from.low.lower(lifted, method.rtype)
    }).orElse(() => WasmWord.fromNumber(0))
  }

  vmGetProp (from: WasmContainer, originPtr: WasmWord, propNamePtr: WasmWord) {
    const targetOrigin = Pointer.fromBytes(from.liftBuf(originPtr));
    const propName = from.liftString(propNamePtr)
    const jig = this.assertJig(targetOrigin)

    const propTarget = jig.getPropValue(propName)
    const lifted = propTarget.lift()
    return from.low.lower(lifted, propTarget.ty)
  }

  vmJigLock (from: WasmContainer, targetOriginPtr: WasmWord, lockType: LockType, argsPtr: WasmWord): void {
    const origin = Pointer.fromBytes(from.liftBuf(targetOriginPtr))

    const jig = this.assertJig(origin)
    jig.lock.assertOpen(this)

    let lockData: Uint8Array
    switch (lockType) {
      case LockType.ADDRESS:
        lockData = from.liftBuf(argsPtr)
        break
      case LockType.JIG:
        lockData = this.stackFromTop(1).get().toBytes()
        break
      case LockType.FROZEN:
      case LockType.PUBLIC:
      case LockType.NONE:
        lockData = new Uint8Array(0)
        break
      default:
        throw new Error(`Unknown locktype: ${lockType}`)
    }

    const lock = fromCoreLock(new CoreLock(lockType, lockData))

    jig.changeLock(lock)
    this.marKJigAsAffected(jig)
  }

  vmConstructorLocal (from: WasmContainer, clsNamePtr: WasmWord, argsPtr: WasmWord): WasmWord {
    const clsName = from.liftString(clsNamePtr)

    const method = from.abi.exportedByName(clsName).get()
      .toAbiClass()
      .constructorDef()
    // Move args
    const argBuf = this.liftArgs(from, argsPtr, method.args)
    const loweredArgs = this.lowerArgs(from, method.args, argBuf)

    const nextOrigin = this.createNextOrigin()
    this.nextOrigin = Option.some(nextOrigin)
    this.stack.push(nextOrigin)
    from.callFn(method.callName(), loweredArgs, method.args.map(arg => arg.type)) // Result is ignored because jigs are saved in local state.
    this.stack.pop()

    const createdJig = this.jigs.find(ref => ref.origin.equals(nextOrigin))
    if (!createdJig) {
      throw new ExecutionError(`[line=${this.execLength()}]Jig was not created`)
    }

    const initParams = new JigInitParams(
      createdJig.origin,
      createdJig.latestLocation,
      createdJig.classPtr(),
      createdJig.lock
    )

    return initParams.lowerInto(from)
  }

  vmCallFunction (from: WasmContainer, pkgIdPtr: WasmWord, fnNamePtr: WasmWord, argsBufPtr: WasmWord): WasmWord {
    const pkgId = from.liftString(pkgIdPtr)
    const fnName = from.liftString(fnNamePtr)
    const wasm = this.assertContainer(pkgId)
    const fn = wasm.abi.exportedByName(fnName).get().toAbiFunction()
    const argsBuf = this.liftArgs(from, argsBufPtr, fn.args)
    const args = this.lowerArgs(wasm, fn.args, argsBuf)

    const res = wasm.callFn(fnName, args, fn.args.map(arg => arg.type))

    return res.orDefault(WasmWord.null());
  }

  vmConstructorRemote (from: WasmContainer, pkgIdStrPtr: WasmWord, namePtr: WasmWord, argBufPtr: WasmWord): WasmWord {
    const pkgId = from.liftString(pkgIdStrPtr)
    const clsName = from.liftString(namePtr)

    const targetContainer = this.assertContainer(pkgId)
    const abiClass = targetContainer.abi.exportedByName(clsName).get().toAbiClass()
    const constructorDef = abiClass.constructorDef()

    const argsBuf = this.liftArgs(from, argBufPtr, constructorDef.args)

    const argsRead = new BufReader(argsBuf)
    const args = constructorDef.args.map(arg => {
      return targetContainer.low.lowerFromReader(argsRead, arg.type)
    })

    const nextOrigin = this.createNextOrigin()
    this.nextOrigin = Option.some(nextOrigin)
    this.stack.push(nextOrigin)
    targetContainer.callFn(constructorDef.callName(), args, constructorDef.args.map(args => args.type))
    this.stack.pop()

    const jig = this.jigs.find(j => j.origin.equals(nextOrigin))
    if (!jig) {
      throw new Error('jig should exist')
    }

    const initParams = new JigInitParams(
      nextOrigin,
      nextOrigin,
      jig.classPtr(),
      jig.lock
    )

    return initParams.lowerInto(from);
  }

  vmCallerTypeCheck (from: WasmContainer, rtIdToCheck: number, exact: boolean): boolean {
    const maybeOrigin = this.stackFromTop(2)
    if (maybeOrigin.isAbsent()) {
      return false
    }
    const callerOrigin = maybeOrigin.get()

    const jig = this.assertJig(callerOrigin)

    // const wasm = jig.ref.container
    const fromAbi = from.abi
    // const callerAbi = wasm.abi

    const fromRtidNode = fromAbi.rtIdById(rtIdToCheck).get()

    if (exact) {
      if (jig.ref.ty.proxy().name !== fromRtidNode.name) {
        return false
      }
    } else {
      if (!jig.classAbi().hierarchyNames().includes(fromRtidNode.name)) {
        return false
      }
    }

    return true
  }

  vmCallerOutputCheck () {
    return this.stackFromTop(2).isPresent();
  }

  vmCallerOutput (from: WasmContainer): WasmWord {
    const callerOrigin = this.stackFromTop(2).get();
    const callerJig = this.assertJig(callerOrigin)

    const buf = new BufWriter()
    buf.writeBytes(callerJig.origin.toBytes())
    buf.writeBytes(callerJig.latestLocation.toBytes())
    buf.writeBytes(callerJig.classPtr().toBytes())

    return from.low.lower(buf.data, new AbiType(outputTypeNode));
  }

  vmCallerOutputVal (from: WasmContainer, keyPtr: WasmWord): WasmWord {
    const callerOrigin = this.stackFromTop(2).get();
    const key = from.liftString(keyPtr)
    const callerJig = this.assertJig(callerOrigin)

    const buf = new BufWriter()

    switch (key) {
      case 'origin':
        buf.writeBytes(callerJig.origin.toBytes())
        break
      case 'location':
        buf.writeBytes(callerJig.latestLocation.toBytes())
        break
      case 'class':
        buf.writeBytes(callerJig.classPtr().toBytes())
        break
      default:
        throw new Error(`unknown vmCallerOutputVal key: ${key}`)
    }

    return from.low.lower(buf.data, AbiType.fromName('ArrayBuffer'))
  }

  vmJigAuthCheck (from: WasmContainer, targetOriginPtr: WasmWord, check: AuthCheck): boolean {
    const origin = Pointer.fromBytes(from.liftBuf(targetOriginPtr))
    const jig = this.assertJig(origin)

    if (check === AuthCheck.LOCK) {
      return jig.lock.canBeChanged(this)
    } else if (check === AuthCheck.CALL) {
      return jig.lock.canReceiveCalls(this)
    } else {
      throw new Error(`unknown auth check: ${check}`)
    }
  }

  vmMeter (gasUsed: bigint) {
    this.measurements.wasmExecuted.add(gasUsed)
  }
}

export {TxExecution}
