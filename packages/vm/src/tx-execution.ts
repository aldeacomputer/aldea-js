import {ContainerRef, JigRef} from "./jig-ref.js"
import {ExecutionError} from "./errors.js"
import {OpenLock} from "./locks/open-lock.js"
import {WasmContainer} from "./wasm-container.js";
import {Address, base16, BufReader, BufWriter, LockType, Output, Pointer, Lock as CoreLock} from '@aldea/core';
import {COIN_CLS_PTR, jigInitParamsTypeNode} from "./memory/well-known-abi-nodes.js";
import {ExecutionResult} from "./execution-result.js";
import {EmptyStatementResult, StatementResult, ValueStatementResult, WasmStatementResult} from "./statement-result.js";
import {ExecContext} from "./tx-context/exec-context.js";
import {PkgData} from "./storage.js";
import {JigData} from "./memory/new-lower-value.js";
import {Option} from "./support/option.js";
import {WasmWord} from "./wasm-word.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {serializeOutput, serializePointer} from "./memory/abi-helpers/serialize-output.js";
import {fromCoreLock} from "./locks/from-core-lock.js";
import {AddressLock} from "./locks/address-lock.js";
import {FrozenLock} from "./locks/frozen-lock.js";
import {AbiArg, AbiMethod} from "./memory/abi-helpers/abi-method.js";

// const COIN_CLASS_PTR = Pointer.fromBytes(new Uint8Array(34))

const MIN_FUND_AMOUNT = 100

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
  instrucCtr: number

  constructor (context: ExecContext) {
    this.execContext = context
    this.jigs = []
    this.wasms = new Map()
    this.stack = []
    this.statements = []
    this.fundAmount = 0
    this.deployments = []
    this.affectedJigs = []
    this.nextOrigin = Option.none()
    this.instrucCtr = 0
  }

  finalize (): ExecutionResult {
    const result = new ExecutionResult(this.execContext.txId())
    // if (this.fundAmount < MIN_FUND_AMOUNT) {
    //   throw new ExecutionError(`Not enough funding. Provided: ${this.fundAmount}. Needed: ${MIN_FUND_AMOUNT}`)
    // }
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
    })
    //
    // this.deployments.forEach(pkgData => {
    //   result.addDeploy(new PackageDeploy(
    //     pkgData.sources,
    //     pkgData.entries,
    //     pkgData.wasmBin,
    //     pkgData.abi,
    //     pkgData.docs
    //   ))
    // })
    //
    // this.wasms = new Map()
    // this.jigs = []
    // this.statements = []
    // result.finish(this.txContext.now())
    return result
  }

  /**
   * Opcodes
   */

  fund (coinIdx: number): StatementResult {
    const coinJig = this.jigAt(coinIdx)
    if (!coinJig.classPtr().equals(COIN_CLS_PTR) ) {
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
    const abiClass = jig.classAbi();
    const method = abiClass.methodByIdx(methodIdx).get()

    const wasm = jig.ref.container;
    const args = this.lowerArgs(wasm, method.args, argsBuf);

    const res = this.performMethodCall(jig, method, args)

    this.marKJigAsAffected(jig)

    let stmt: StatementResult = res.map<StatementResult>(ref => {
      return new ValueStatementResult(this.statements.length, ref.ty, ref.ptr, ref.container)
    }).orElse(() => new EmptyStatementResult(this.statements.length))

    this.statements.push(stmt)
    return stmt
  }

  loadJigByOutputId(outputId: Uint8Array): StatementResult {
    const output = this.execContext.stateByOutputId(outputId)
    const jigRef = this.hydrate(output)

    const ret = new ValueStatementResult(this.statements.length, jigRef.ref.ty, jigRef.ref.ptr, jigRef.ref.container);
    this.statements.push(ret)
    return ret
  }

  instantiate (statementIndex: number, classIdx: number, argsBuf: Uint8Array): StatementResult {
    const statement = this.statements[statementIndex]
    const wasm = statement.asContainer()

    const classNode = wasm.abi.exportedByIdx(classIdx).get().toAbiClass()
    // const args = bcs.decode(`${classNode.name}_constructor`, argsBuf)


    const method = wasm.abi.exportedByName(classNode.name).get().toAbiClass().methodByName('constructor').get()

    const callArgs = this.lowerArgs(wasm, method.args, argsBuf)

    this.stack.push(this.createNextOrigin())
    const result = wasm
      .callFn(method.callName(), callArgs, method.args.map(arg => arg.type))
      .get()
    this.stack.pop()

    const jigRef = this.jigs.find(j => j.package === wasm && j.ref.ptr.equals(result))
    if (!jigRef) {
      throw new Error('jig should had been created created')
    }
    this.marKJigAsAffected(jigRef)

    const ret = new ValueStatementResult(this.statements.length, method.rtype, result, wasm);
    this.statements.push(ret)
    return ret
  }

  // private serializeJig(jig: JigRef): Uint8Array {
  //   const wasm = jig.package
  //   const lifter = new NewLiftValue(wasm)
  //   return lifter.lift(jig.ref.ptr, jig.ref.ty)
  // }

  // loadModule(moduleId: Uint8Array): WasmContainer {
  //   const existing = this.wasms.get(base16.encode(moduleId))
  //   if (existing) {
  //     return existing
  //   }
  //   const wasmInstance = this.txContext.wasmFromPkgId(moduleId)
  //   wasmInstance.setExecution(this)
  //   this.wasms.set(base16.encode(moduleId), wasmInstance)
  //   return wasmInstance
  // }

  // getLoadedModule(pkgId: string): WasmContainer {
  //   const wasm = this.wasms.get(pkgId)
  //   if (!wasm) {
  //     throw new Error(`Package with id ${pkgId} was expected to be loaded but it's not.`)
  //   }
  //   return wasm
  // }

  // findRemoteUtxoHandler(origin: ArrayBuffer): JigRef {
  //   const jigRef = this.jigs.find(j => Buffer.from(j.originBuf).equals(Buffer.from(origin)))
  //   if (!jigRef) {
  //     throw new Error('should exist')
  //   }
  //   return jigRef
  // }

  // remoteCallHandler(callerInstance: WasmContainer, targetOrigin: Pointer, methodName: string, argBuff: Uint8Array): WasmValue {
  //   let targetJig = this.jigs.find(j => j.origin.equals(targetOrigin))
  //   if (!targetJig) {
  //     targetJig = this.findJigByOrigin(targetOrigin)
  //   }
  //
  //   const klassNode = targetJig.package.abi.exportedByIdx(targetJig.classIdx).get().toAbiClass()
  //   const method = klassNode.methodByName(methodName).get()
  //
  //   const args = callerInstance.liftArguments(argBuff, method.args)
  //   this.localCallStartHandler(targetJig, method.name)
  //   const result = targetJig.package.instanceCall(targetJig, method, args);
  //   this.localCallEndHandler()
  //   return result
  // }

  // remoteStaticExecHandler(srcModule: WasmContainer, targetModId: Uint8Array, fnStr: string, argBuffer: Uint8Array): WasmValue {
  //   const targetMod = this.loadModule(targetModId)
  //
  //   const [className, methodName] = fnStr.split('_')
  //
  //   const obj = targetMod.abi.exportedByName(className).get().toAbiClass()
  //   const method = obj.methodByName(methodName).get()
  //
  //   const argValues = srcModule.liftArguments(argBuffer, method.args)
  //
  //   return targetMod.staticCall(method, argValues)
  // }

  // getPropHandler(origin: Pointer, propName: string): Prop {
  //   let jig = this.jigs.find(j => j.origin.equals(origin))
  //   if (!jig) {
  //     jig = this.findJigByOrigin(origin)
  //   }
  //   return jig.package.getPropValue(jig.ref.ptr, jig.classIdx, propName)
  // }

  // remoteLockHandler(childOrigin: Pointer, type: LockType, extraArg: ArrayBuffer): void {
  //   const childJigRef = this.getJigRefByOrigin(childOrigin)
  //   if (!childJigRef.lock.canBeChangedBy(this)) {
  //     throw new PermissionError('lock cannot be changed')
  //   }
  //   if (type === LockType.CALLER) {
  //     const parentJigOrigin = this.stack[this.stack.length - 1]
  //     childJigRef.changeLock(new JigLock(parentJigOrigin))
  //   } else if (type === LockType.NONE) {
  //     childJigRef.changeLock(new NoLock())
  //   } else if (type === LockType.PUBKEY) {
  //     childJigRef.changeLock(new UserLock(new Address(new Uint8Array(extraArg))))
  //   } else if (type === LockType.ANYONE) {
  //     if (!this.stackTop().equals(childJigRef.origin)) {
  //       throw new ExecutionError('cannot make another jig public')
  //     }
  //     childJigRef.changeLock(new PublicLock())
  //   } else if (type === LockType.FROZEN) {
  //     childJigRef.changeLock(new FrozenLock())
  //   } else {
  //     throw new Error('not implemented yet')
  //   }
  //   this.marKJigAsAffected(childJigRef)
  // }

  // localCallStartHandler(targetJig: JigRef, fnName: string) {
  //   if (!targetJig.lock.acceptsExecution(this)) {
  //     const stackTop = this.stackTop()
  //     if (stackTop) {
  //       throw new PermissionError(`jig ${targetJig.origin.toString()} is not allowed to exec "${fnName}" called from ${this.stackTop().toString()}${targetJig.lock.constructor === FrozenLock ? " because it's frozen" : ""}`)
  //     } else {
  //       throw new PermissionError(`jig ${targetJig.origin.toString()} is not allowed to exec "${fnName}"${targetJig.lock.constructor === FrozenLock ? " because it's frozen" : ""}`)
  //     }
  //   }
  //   this.marKJigAsAffected(targetJig)
  //   this.stack.push(targetJig.origin)
  // }

  // localCallEndHandler() {
  //   this.stack.pop()
  // }


  // remoteAuthCheckHandler(callerOrigin: Pointer, check: AuthCheck): boolean {
  //   const jigRef = this.jigs.find(jigR => jigR.origin.equals(callerOrigin))
  //   if (!jigRef) {
  //     throw new Error('jig ref should exists')
  //   }
  //   if (check === AuthCheck.CALL) {
  //     return jigRef.lock.acceptsExecution(this)
  //   } else {
  //     return jigRef.lock.acceptsChangeFrom(callerOrigin, this)
  //   }
  // }



  private hydrate(output: Output): JigRef {
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
        fromCoreLock(output.lock)
    )

    this.jigs.push(newJigRef)
    return newJigRef
  }

  // loadJigByOrigin(origin: Pointer): StatementResult {
  //   const jigRef = this.findJigByOrigin(origin)
  //   const typeNode = emptyTn(jigRef.className())
  //   const ret = new ValueStatementResult(this.statements.length, typeNode, jigRef, jigRef.package);
  //   this.statements.push(ret)
  //   return ret
  // }

  // private hydrateLock(frozenLock: any): Lock {
  //   if (frozenLock.type === LockType.PUBKEY) {
  //     return new UserLock(new Address(frozenLock.data))
  //   } else if (frozenLock.type === LockType.CALLER) {
  //     return new JigLock(Pointer.fromBytes(frozenLock.data))
  //   } else if (frozenLock.type === LockType.ANYONE) {
  //     return new PublicLock()
  //   } else if (frozenLock.type === LockType.FROZEN) {
  //     return new FrozenLock()
  //   } else {
  //     throw new Error(`unknown lock type: ${frozenLock.type}`)
  //   }
  // }


  private lowerArgs(wasm: WasmContainer, args: AbiArg[], argsBuf: Uint8Array): WasmWord[] {
    const reader= new BufReader(argsBuf)
    const indexes = reader.readSeq(r => r.readU8())

    return args.map((arg, i) => {
      const importedOrExported = wasm.abi.exportedByName(arg.type.name).map(e => e.idx)
        .or(wasm.abi.importedByName(arg.type.name).map(e => e.idx))
      if (importedOrExported.isPresent() || indexes.includes(i)) {
        const idx = reader.readU8()
        const ref = this.statements[idx].asValue()
        const lifted = ref.container.lifter.lift(ref.ptr, ref.ty)
        return wasm.low.lower(lifted, arg.type)
      } else {
        return wasm.low.lowerFromReader(reader, arg.type)
      }
    })
  }

  // instantiateByClassName(wasm: WasmContainer, className: string, args: any[]): StatementResult {
  //   const knownWasm = this.wasms.get(base16.encode(wasm.id))
  //   if (wasm !== knownWasm) {
  //     throw new Error('wasm instance does not belong to current execution')
  //   }
  //
  //   const wasmValue = this.instantiate(wasm, className, args)
  //
  //   const ret = new ValueStatementResult(this.statements.length, wasmValue.node, wasmValue.value, wasmValue.mod);
  //   this.statements.push(ret)
  //   return ret
  // }

  private performMethodCall(jig: JigRef, method: AbiMethod, loweredArgs: WasmWord[]): Option<ContainerRef> {
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

  // callInstanceMethod(jig: JigRef, methodName: string, args: any[]): StatementResult {
  //   if (!this.jigs.includes(jig)) {
  //     throw new ExecutionError(`the jig does not belong to the current tx`)
  //   }
  //   const method = jig.classAbi().methodByName(methodName).get()
  //
  //   this.localCallStartHandler(jig, methodName)
  //   const methodResult = jig.package.instanceCall(jig, method, args);
  //   this.localCallEndHandler()
  //   const ret = new ValueStatementResult(this.statements.length, methodResult.node, methodResult.value, methodResult.mod)
  //   this.statements.push(ret)
  //   return ret
  // }

  // callInstanceMethodByIndex(jigIndex: number, methodIdx: number, argsBuf: Uint8Array): StatementResult {
  //   const jigRef = this.getStatementResult(jigIndex).asJig()
  //   const method = jigRef.classAbi().methodByIdx(methodIdx).get()
  //   const bcs = new BCS(jigRef.package.abi.abi)
  //   const args = bcs.decode(`${jigRef.className()}$${method.name}`, argsBuf)
  //   this.localCallStartHandler(jigRef, method.name)
  //   const methodResult = jigRef.package.instanceCall(jigRef, method, args)
  //   this.localCallEndHandler()
  //   const ret = new ValueStatementResult(this.statements.length, methodResult.node, methodResult.value, methodResult.mod)
  //   this.statements.push(ret)
  //   return ret
  // }

  // execStaticMethod(wasm: WasmContainer, className: string, methodName: string, args: any[]): ValueStatementResult {
  //   const method = wasm.abi.exportedByName(className).get().toAbiClass().methodByName(methodName).get()
  //
  //   let {node, value, mod} = wasm.staticCall(method, args)
  //   const ret = new ValueStatementResult(
  //     this.statements.length,
  //     node,
  //     value,
  //     mod
  //   )
  //
  //   this.statements.push(ret)
  //   return ret
  // }

  // execStaticMethodByIndex(moduleIndex: number, className: string, methodName: string, argsBuf: Uint8Array): number {
  //   const wasm = this.getStatementResult(moduleIndex).asContainer()
  //   const bcs = new BCS(wasm.abi.abi)
  //   const args = bcs.decode(`${className}_${methodName}`, argsBuf)
  //   this.execStaticMethod(wasm, className, methodName, args)
  //   return this.statements.length - 1
  // }

  // execExportedFnByIndex(moduleIndex: number, fnIdx: number, args: Uint8Array): StatementResult {
  //   const wasm = this.getStatementResult(moduleIndex).asContainer()
  //   const fnNode = wasm.abi.exportedByIdx(fnIdx).get().toAbiFunction()
  //
  //   const bcs = new BCS(wasm.abi.abi)
  //   let {node, value, mod} = wasm.functionCall(fnNode, bcs.decode(fnNode.name, args))
  //
  //   const ret = new ValueStatementResult(
  //     this.statements.length,
  //     node,
  //     value,
  //     mod
  //   )
  //
  //   this.statements.push(ret)
  //   return ret
  // }

  // execExportedFnByName(wasm: WasmContainer, fnName: string, args: any[]): StatementResult {
  //   const fnNode = wasm.abi.exportedByName(fnName).get().toAbiFunction()
  //   let {node, value, mod} = wasm.functionCall(fnNode, args)
  //
  //   const ret = new ValueStatementResult(
  //     this.statements.length,
  //     node,
  //     value,
  //     mod
  //   )
  //
  //   this.statements.push(ret)
  //   return ret
  // }


  createNextOrigin () {
    return new Pointer(this.execContext.txHash(), this.affectedJigs.length)
  }

  getStatementResult (index: number): StatementResult {
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

  private jigAt(jigIndex: number): JigRef {
    const ref = this.getStatementResult(jigIndex).asValue()
    return Option.fromNullable(this.jigs.find(j => j.ref.equals(ref)))
        .orElse(() => { throw new Error(`index ${jigIndex} is not a jig`)})
  }

  lockJig (jigIndex: number, address: Address): StatementResult {
    const jigRef = this.jigAt(jigIndex)
    return this.lockJigToUser(jigRef, address)
  }

  private assertContainer(modId: string): WasmContainer {
    const existing = this.wasms.get(modId)
    if (existing) {
      return existing
    }

    const container = this.execContext.wasmFromPkgId(modId)
    container.setExecution(this)
    this.wasms.set(container.id, container)
    return container
  }

  import (modId: Uint8Array): StatementResult {
    const instance = this.assertContainer(base16.encode(modId))
    const ret = new WasmStatementResult(this.statements.length, instance);
    this.statements.push(ret)
    return ret
  }

  async deployPackage (entryPoint: string[], sources: Map<string, string>): Promise<StatementResult> {
    const pkgData = await this.execContext.compile(entryPoint, sources)
    this.deployments.push(pkgData)
    const wasm = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    wasm.setExecution(this)
    this.wasms.set(base16.encode(wasm.hash), wasm)
    const ret = new WasmStatementResult(this.statements.length, wasm)
    this.statements.push(ret)
    return ret
  }

  signedBy (addr: Address): boolean {
    return this.execContext.signers()
        .some(s => s.toAddress().equals(addr))
  }

  private execLength () {
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

  private assertJig(origin: Pointer) {
    return Option.fromNullable(
      this.jigs.find(j => j.origin.equals(origin))
    ).orElse(() => {
      const output = this.execContext.inputByOrigin(origin)
      return this.hydrate(output)
    })
  }

  private liftArgs(from: WasmContainer, ptr: WasmWord, argDef: AbiArg[]): Uint8Array {
    const w = new BufWriter()
    w.writeU8(0)

    const argsBuf = new BufReader(base16.decode(from.liftString(ptr)))

    for (const arg of argDef) {
      const lifted = argsBuf.readFixedBytes(arg.type.ownSize());
      w.writeFixedBytes(lifted)
    }

    return w.data
  }

  stackFromTop(n: number): Option<Pointer> {
    return Option.fromNullable(this.stack[this.stack.length - n])
  }


  /*
   * Callbacks
   */

  vmJigInit (from: WasmContainer): WasmWord {
    const nextOrigin = this.createNextOrigin();
    this.nextOrigin = Option.some(nextOrigin)
    const buf = new BufWriter()
    buf.writeBytes(nextOrigin.toBytes())
    buf.writeBytes(nextOrigin.toBytes())
    buf.writeBytes(new Uint8Array(0))
    buf.writeU32(LockType.NONE)
    buf.writeBytes(new Uint8Array(0))

    return from.low.lower(buf.data, new AbiType(jigInitParamsTypeNode))
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
        new OpenLock()
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

    const method = jig.classAbi().methodByName(methodName).get()

    // Move args
    const argBuf = this.liftArgs(from, argsPtr, method.args)
    const argsReader = new BufReader(argBuf)
    const loweredArgs = method.args.map(arg => {
      return jig.ref.container.low.lowerFromReader(argsReader, arg.type)
    })

    const methodRes = this.performMethodCall(jig, method, loweredArgs)

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
    if (lockType === LockType.ADDRESS) {
      lockData = from.liftBuf(argsPtr)
    } else if (lockType === LockType.JIG) {
      lockData = this.stackFromTop(1).get().toBytes()
    } else {
      lockData = new Uint8Array(0)
    }
    const lock = fromCoreLock(new CoreLock(lockType, lockData))

    jig.changeLock(lock)
    this.marKJigAsAffected(jig)
  }
}

export {TxExecution}
