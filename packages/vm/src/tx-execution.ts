import {ContainerRef, JigRef} from "./jig-ref.js"
import {ExecutionError, IvariantBroken, PermissionError} from "./errors.js"
import {OpenLock} from "./locks/open-lock.js"
import {AuthCheck, WasmContainer} from "./wasm-container.js";
import {Address, base16, BufReader, BufWriter, Lock as CoreLock, LockType, Output, Pointer} from '@aldea/core';
import {COIN_CLS_PTR, outputTypeNode} from "./well-known-abi-nodes.js";
import {ExecutionResult, PackageDeploy} from "./execution-result.js";
import {EmptyStatementResult, StatementResult, ValueStatementResult, WasmStatementResult} from "./statement-result.js";
import {ExecContext} from "./tx-context/exec-context.js";
import {PkgData} from "./storage.js";
import {JigData} from "./memory/lower-value.js";
import {Option} from "./support/option.js";
import {WasmArg, WasmWord} from "./wasm-word.js";
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
import {Measurements} from "./metering/measurements.js";

export const MIN_FUND_AMOUNT = 100


/**
 * Class representing the execution of a transaction.
 * The main methods are 1 to 1 relation with Aldea opcodes.
 * This class is in charge of coordinate all the containers being used,
 * validate the interactions between jigs and keep track of all the data
 * produced by the execution.
 *
 * @class
 * @param {ExecContext} context - The execution context of the transaction.
 * @param {ExecOpts} opts - The execution options for the transaction.
 */
class TxExecution {
  /* This object provides all the data needed from outside to make the execution work */
  execContext: ExecContext;

  /* Jigs that were hydrated during the execution of the current tx */
  private jigs: JigRef[];

  /* Containers being used by the tx. */
  private wasms: Map<string, WasmContainer>;

  /* Permission stack. Keeps track of which jig is executing at a given moment. */
  private readonly stack: Pointer[];

  /* New packages deployed in the current tx. */
  deployments: PkgData[];

  /* The result of each statement (opcode) executed in the current tx */
  statements: StatementResult[]

  /* How many coins where used to fund the tx at a given moment */
  private fundAmount: number;

  /**
   * Jigs that were affected by the curret tx. An affected jig is a method
   * that requires a new location at the end of the transaction. Which means that
   * it's a new jig or it received a method call from the top level or from
   * another jig.
   * @private
   */
  private affectedJigs: JigRef[]

  /* Auxiliary data to keep jig creations in sync */
  private nextOrigin: Option<Pointer>

  /* Options for the current execution */
  private opts: ExecOpts

  /* Measurements used to calculate hydro (gas) usage. */
  private measurements: Measurements;

  /**
   * Constructor for the class.
   *
   * @param {ExecContext} context - The execution context.
   * @param {ExecOpts} opts - The execution options.
   */
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
    this.opts = opts
    this.measurements = new Measurements(opts)
    this.measurements.numSigs.add(BigInt(this.execContext.signers().length))
  }

  // -------
  // Opcodes
  // -------

  /**
   * Executes an `IMPORT` operation. Imports a module specified by the given module ID.
   *
   * @param {Uint8Array} modId - The module ID to import.
   * @return {StatementResult} - The statement result.
   */
  import (modId: Uint8Array): StatementResult {
    const instance = this.assertContainer(base16.encode(modId))
    const ret = new WasmStatementResult(this.statements.length, instance);
    this.statements.push(ret)
    return ret
  }

  /**
   * Executes a `LOAD` operation. Loads a jig from the context using the output id as key.
   * If needed it hydrates a container for it.
   *
   * @param {Uint8Array} outputId - The ID of the output to load.
   * @return {StatementResult} - The loaded output as a StatementResult object.
   */
  load (outputId: Uint8Array): StatementResult {
    const output = this.execContext.outputById(outputId)
    const jigRef = this.hydrate(output)

    const ret = new ValueStatementResult(this.statements.length, jigRef.ref.ty.proxy(), jigRef.ref.ptr, jigRef.ref.container);
    this.statements.push(ret)
    return ret
  }

  /**
   * Executes a `LOADBYORIGIN` operation. Loads a Jig from context by its origin. If needed it hydrates the jig
   * container.
   *
   * @param {Uint8Array} originBytes - The origin bytes of the statement.
   *
   * @returns {StatementResult} - The loaded statement result.
   */
  loadByOrigin (originBytes: Uint8Array): StatementResult {
    this.measurements.originChecks.inc()
    const origin = Pointer.fromBytes(originBytes)
    const output = this.execContext.inputByOrigin(origin)
    const jigRef = this.hydrate(output)
    const stmt = new ValueStatementResult(this.statements.length, jigRef.ref.ty.proxy(), jigRef.ref.ptr, jigRef.ref.container)
    this.statements.push(stmt)
    return stmt
  }

  /**
   * Executes a `NEW` operation. Searches in the package at the statement `statementIndex`,
   * and looks for a class at the index `classIdx`. Then creates an instance using the provided
   * arguments.
   *
   * @param {number} statementIndex - The index of the statement in the statements array.
   * @param {number} classIdx - The index of the class in the wasm ABI.
   * @param {Uint8Array} argsBuf - Arguments encoded in Aldea Format.
   * @returns {StatementResult} - Reference to the created instance.
   * @throws {ExecutionError} - If the instantiated jig is not found.
   */
  instantiate (statementIndex: number, classIdx: number, argsBuf: Uint8Array): StatementResult {
    const statement = this.statements[statementIndex]
    const wasm = statement.asContainer()

    const classNode = wasm.abi.exportedByIdx(classIdx).get().toAbiClass()

    const method = wasm.abi.exportedByName(classNode.name).get().toAbiClass().constructorDef()
    const callArgs = this.translateAndLowerArgs(wasm, method.args, argsBuf)

    const nextOrigin = this.createNextOrigin()
    this.nextOrigin = Option.some(nextOrigin)
    this.stack.push(nextOrigin)
    const result = wasm
      .callFn(method.callName(), callArgs, method.args.map(arg => arg.type))
      .get()
    this.stack.pop()

    const jigRef = this.jigs.find(j => j.package === wasm && j.ref.ptr.equals(result))
    if (!jigRef) {
      throw new ExecutionError('jig should had been created created')
    }

    const ret = new ValueStatementResult(this.statements.length, method.rtype, result, wasm);
    this.statements.push(ret)
    return ret
  }

  /**
   * Executes a `CALL` operation. Call a method on a Jig instance. It sends a message
   * to the jig contained at `jigIdx` statement index. The message is defined by `methodIdx`.
   *
   * @param {number} jigIdx - The index of the Jig instance.
   * @param {number} methodIdx - The index of the method to call.
   * @param {Uint8Array} argsBuf - The buffer containing the arguments for the method call.
   * @returns {StatementResult} - The result of the method call as a StatementResult object.
   */
  call (jigIdx: number, methodIdx: number, argsBuf: Uint8Array): StatementResult {
    const jig = this.jigAt(jigIdx)
    jig.lock.assertOpen(this)
    const abiClass = jig.classAbi();
    const method = abiClass.methodByIdx(methodIdx).get()

    const wasm = jig.ref.container;
    const args = this.translateAndLowerArgs(wasm, method.args, argsBuf);

    this.marKJigAsAffected(jig)
    const res = this.performMethodCall(jig, method, args)

    let stmt: StatementResult = res.map<StatementResult>(ref => {
      return new ValueStatementResult(this.statements.length, ref.ty, ref.ptr, ref.container)
    }).orElse(() => new EmptyStatementResult(this.statements.length))

    this.statements.push(stmt)
    return stmt
  }

  /**
   * Executes an `EXEC` operation. It takes a function exported at `fnIndex` from
   * the package provided in the statemnt number `wasmIdx` using the arguments provided
   * by parameter.
   *
   * @param {number} wasmIdx - The index of the WebAssembly module in the `statements` array.
   * @param {number} fnIdx - The index of the function to execute within the WebAssembly module.
   * @param {Uint8Array} argsBuf - The arguments to pass to the function encoded in Aldea Format.
   * @returns {StatementResult} - The result of executing the function.
   */
  exec (wasmIdx: number, fnIdx: number, argsBuf: Uint8Array): StatementResult {
    const wasm = this.statements[wasmIdx].asContainer()
    const fn = wasm.abi.exportedByIdx(fnIdx).get().toAbiFunction()
    const args = this.translateAndLowerArgs(wasm, fn.args, argsBuf)

    const value = wasm.callFn(fn.name, args, fn.args.map(a => a.type))

    const stmt = value.map<StatementResult>(ptr =>
      new ValueStatementResult(this.statements.length, fn.rtype, ptr, wasm)
    ).orDefault(new EmptyStatementResult(this.statements.length))

    this.statements.push(stmt)

    return stmt
  }

  /**
   * Executes a `FUND` operation. Funds using a coin at the specified index. It uses the entire balance
   * and freezes the coin.
   *
   * @param {number} coinIdx - The index of the coin to be funded.
   *
   * @returns {StatementResult} - Empty statement.
   *
   * @throws {ExecutionError} - If the statement at the specified idx is not a coin.
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

  /**
   * Performs a `LOCK` operation. Locks the jig at the specified index using the given address.
   *
   * @param {number} jigIndex - The index of the jig to lock.
   * @param {Address} address - The address to lock the jig to.
   * @return {StatementResult} - Empty statement result.
   */
  lockJig (jigIndex: number, address: Address): StatementResult {
    const jigRef = this.jigAt(jigIndex)

    jigRef.lock.assertOpen(this)
    this.marKJigAsAffected(jigRef)
    jigRef.changeLock(new AddressLock(address))
    const ret = new EmptyStatementResult(this.statements.length);
    this.statements.push(ret)

    return ret
  }

  /**
   * Performs a `DEPLOY` operation. Compiles the given sources and deploys them. This method
   * should be awaited before executing another instruction
   *
   * @param {string[]} entryPoint - The entry point for the package.
   * @param {Map<string, string>} sources - A map of source files, where the key is the file name and the value is the source code.
   * @return {Promise<StatementResult>} - Resolves to a statement result containing the deployed package.
   */
  async deploy (entryPoint: string[], sources: Map<string, string>): Promise<StatementResult> {
    this.measurements.deploys.add(this.opts.deployHydroCost)
    const pkgData = await this.execContext.compile(entryPoint, sources)
    this.deployments.push(pkgData)
    const wasm = new WasmContainer(pkgData.mod, pkgData.abi, pkgData.id)
    wasm.setExecution(this)
    this.wasms.set(base16.encode(wasm.hash), wasm)
    const ret = new WasmStatementResult(this.statements.length, wasm)
    this.statements.push(ret)
    return ret
  }

  /**
   * Executes a `SIGN` operation. Signature verification happens in a different stage,
   * so this method just keeps track of the gas usage (hydros)
   *
   * @param {Uint8Array} _sig - The signature to be generated.
   * @param {Uint8Array} _pubKey - The public key to be used for signing.
   * @return {StatementResult} - The statement result object representing the signature generation.
   */
  sign (_sig: Uint8Array, _pubKey: Uint8Array): StatementResult {
    const stmt = new EmptyStatementResult(this.statements.length);
    this.statements.push(stmt)
    return stmt
  }

  /**
   * Executes a `SIGNTO` operation. Signature verification happens in a different stage,
   * so this method just keeps track of the gas usage (hydros)
   *
   * @param {Uint8Array} _sig - The signature.
   * @param {Uint8Array} _pubKey - The public key to verify.
   * @return {StatementResult} - Empty statement result.
   */
  signTo (_sig: Uint8Array, _pubKey: Uint8Array): StatementResult {
    const stmt = new EmptyStatementResult(this.statements.length);
    this.statements.push(stmt)
    return stmt
  }

  /**
   * Finishes the execution of the transaction. Returns a summary of the execution
   * with the final state of the jigs, the fees paid and the hydros consumed.
   *
   * @return {ExecutionResult} The result of the execution.
   */
  finalize (): ExecutionResult {
    const result = new ExecutionResult(base16.encode(this.execContext.txHash()))
    if (this.fundAmount < MIN_FUND_AMOUNT) {
      throw new ExecutionError(`Not enough funding. Provided: ${this.fundAmount}. Needed: ${MIN_FUND_AMOUNT}`)
    }
    this.jigs.forEach(jigRef => {
      if (jigRef.lock.isOpen()) {
        throw new PermissionError(`Finishing tx with unlocked jig (${jigRef.className()}): ${jigRef.origin}`)
      }
    })

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
   * Hydrates a jig from an output. If the jig is already hydrated it returns the existing one.
   *
   * @private
   * @param {Output} output - The output to hydrate.
   * @returns {JigRef} - The hydrated JigRef object.
   */
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

  /**
   * Resolves interpolated indexes in Argenguments and lower the data
   * into the given container.
   *
   * @param {WasmContainer} wasm - The WebAssembly container.
   * @param {AbiArg[]} args - The arguments to translate and lower.
   * @param {Uint8Array} rawArgs - The raw arguments.
   * @private
   *
   * @return {WasmWord[]} - The translated and lowered arguments as an array of WasmWord objects.
   */
  private translateAndLowerArgs (wasm: WasmContainer, args: AbiArg[], rawArgs: Uint8Array): WasmWord[] {
    const fixer = new ArgsTranslator(this, wasm.abi)
    const argsBuf = fixer.fix(rawArgs, args)


    return this.lowerArgs(wasm, args, argsBuf)
  }

  /**
   * Lower the arguments into the given container. This method
   * expects that the arguments have no indexes to be resolved.
   *
   * @param {WasmContainer} wasm - The WebAssembly container.
   * @param {AbiArg[]} args - The arguments to be lowered.
   * @param {Uint8Array} argsBuf - The buffer for storing the arguments.
   *
   * @returns {Array} - The lowered arguments.
   *
   * @private
   */
  private lowerArgs (wasm: WasmContainer, args: AbiArg[], argsBuf: Uint8Array) {
    const reader = new BufReader(argsBuf)

    return args.map((arg) => {
      return wasm.low.lowerFromReader(reader, arg.type)
    })
  }

  /**
   * Performs a method call on a JigRef object.
   *
   * @param {JigRef} jig - The JigRef object to perform the method call on.
   * @param {AbiMethod} method - The AbiMethod object representing the method to call.
   * @param {WasmWord[]} loweredArgs - An array of arguments to pass to the method.
   * @returns {Option<ContainerRef>} The result of the method call, wrapped in an Option container.
   *                                 If the method call is successful, it returns a ContainerRef object,
   *                                 otherwise it returns None.
   * @private
   */
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

  /**
   * Creates the origin for the next jig created in the current tx.
   *
   * @returns {Pointer} The new Pointer for the next instance.
   */
  private createNextOrigin () {
    return new Pointer(this.execContext.txHash(), this.affectedJigs.length)
  }

  /**
   * Returns the statement at the given index.
   *
   * @param {number} index - The index of the statement.
   * @returns {StatementResult} - The statement at the given index.
   */
  stmtAt (index: number): StatementResult {
    const result = this.statements[index]
    if (!result) {
      throw new ExecutionError(`undefined index: ${index}`)
    }
    return result
  }

  /**
   * Retrieves the JigRef at the specified index.
   *
   * @param {number} jigIndex - The index of the JigRef to retrieve.
   * @private
   *
   * @return {JigRef} The JigRef at the specified index.
   * @throws {ExecutionError} If the index is not a valid JigRef.
   * @throws {InvariantBroken} If the lowered JigRef is not in the list of jigs.
   */
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


  /**
   * If a container with the id `modId` was provided by context, it returns it.
   * Otherwise, it fails the execution.
   *
   * @param {string} modId - The module ID of the WasmContainer to assert.
   * @returns {WasmContainer} - The asserted or newly created WasmContainer.
   * @private
   */
  private assertContainer (modId: string): WasmContainer {
    const existing = this.wasms.get(modId)
    if (existing) {
      return existing
    }

    const container = this.execContext.wasmFromPkgId(modId)
    container.setExecution(this)
    this.wasms.set(container.id, container)
    this.measurements.numContainers.inc()
    return container
  }


  /**
   * Checks if the given address is part of the signers of the tx.
   * The signers are not take from the `SIGN` and `SIGNTO` operations. Instead
   * they are provided by context.
   *
   * @param {Address} addr - The address to check.
   * @return {boolean} - True if the given address is signed by any signer, false otherwise.
   */
  signedBy (addr: Address): boolean {
    return this.execContext.signers()
      .some(s => s.toAddress().equals(addr))
  }

  /**
   * Returns how many opcodes where executed. It's the equivalent of the
   * "instruction pointer" in a regular machine.
   *
   * @return {number} The length of the statements array.
   */
  execLength () {
    return this.statements.length
  }

  /**
   * Marks the given Jig as affected. Affected jigs are the ones that
   * get into the outpus at the end of the transaction.
   *
   * @param {JigRef} jig - The Jig object to mark as affected.
   *
   * @private
   */
  private marKJigAsAffected (jig: JigRef): void {
    const exists = this.affectedJigs.find(affectedJig => affectedJig.origin.equals(jig.origin))
    if (!exists) {
      this.affectedJigs.push(jig)
    }
  }

  /**
   * Retrieves the JigData for a given Pointer. If the jig data is not provided
   * by the context it fails.
   *
   * This method is used to lower data into wasm memory.
   *
   * @param {Pointer} p - The Pointer for which to retrieve the JigData.
   * @returns {Option<JigData>} - An Option container that may contain the JigData for the given Pointer.
   *                              If the JigData is found, it returns a JigData object, otherwise it returns None.
   */
  private getJigData (p: Pointer): Option<JigData> {
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

  /**
   * If a jig with the given origin is found, it returns it. Otherwise, it
   * tries to hydrate it and return it. If the jig is not present it fails.
   *
   * @param {Pointer} origin - The origin to check for the jig.
   * @private
   * @returns {Option} - The found jig or the result of hydrating the output from the execution context.
   */
  private assertJig (origin: Pointer) {
    return Option.fromNullable(
      this.jigs.find(j => j.origin.equals(origin))
    ).orElse(() => {
      const output = this.execContext.inputByOrigin(origin)
      return this.hydrate(output)
    })
  }

  /**
   * Lifts the arguments from the given container and returns them packed in a Uint8Array.
   *
   * @param {WasmContainer} from - The container from which to lift the arguments.
   * @param {WasmWord} ptr - The pointer to the arguments.
   * @param {AbiArg[]} argDef - The definition of the arguments.
   *
   * @returns {Uint8Array} - The lifted arguments.
   *
   * @private
   */
  private liftArgs (from: WasmContainer, ptr: WasmWord, argDef: AbiArg[]): Uint8Array {
    const w = new BufWriter()

    const argsBuf = new BufReader(from.liftBuf(ptr))

    for (const arg of argDef) {
      const ptr = WasmWord.fromReader(argsBuf, arg.type)
      const lifted = from.lifter.lift(ptr, arg.type)
      w.writeFixedBytes(lifted)
    }

    return w.data
  }



  /**
   * Returns the pointer at the top of the permission stack.
   *
   * @param {number} n - The number of elements to go back in the stack.
   * @returns {Option<Pointer>} - The pointer at the desired position.
   *
   * @private
   */
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

  vmJigInit (from: WasmContainer): WasmArg {
    this.measurements.newJigs.inc()
    const nextOrigin = this.nextOrigin.get()
    const jigInitParams = new JigInitParams(
      nextOrigin,
      nextOrigin,
      new Pointer(new Uint8Array(32).fill(0xff), 0xffff),
      new OpenLock()
    )
    return jigInitParams.lowerInto(from).toWasmArg(AbiType.u32())
  }

  vmJigLink (from: WasmContainer, jigPtr: WasmWord, rtId: number): WasmArg {
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
        AbiType.buffer()
      ).toWasmArg(AbiType.u32())
  }

  vmCallMethod (from: WasmContainer, targetPtr: WasmWord, methodNamePtr: WasmWord, argsPtr: WasmWord): WasmArg {
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
    }).orElse(() => WasmWord.fromNumber(0)).toWasmArg(method.rtype)
  }

  vmGetProp (from: WasmContainer, originPtr: WasmWord, propNamePtr: WasmWord): WasmArg {
    const targetOrigin = Pointer.fromBytes(from.liftBuf(originPtr));
    const propName = from.liftString(propNamePtr)
    const jig = this.assertJig(targetOrigin)

    const propTarget = jig.getPropValue(propName)
    const lifted = propTarget.lift()
    const word = from.low.lower(lifted, propTarget.ty);
    return word.toWasmArg(propTarget.ty)
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

  vmCallFunction (from: WasmContainer, pkgIdPtr: WasmWord, fnNamePtr: WasmWord, argsBufPtr: WasmWord): WasmArg {
    const pkgId = from.liftString(pkgIdPtr)
    const fnName = from.liftString(fnNamePtr)
    const wasm = this.assertContainer(pkgId)

    const fn = wasm.abi.exportedByName(fnName).get().toAbiFunction()
    const argsBuf = this.liftArgs(from, argsBufPtr, fn.args)
    const args = this.lowerArgs(wasm, fn.args, argsBuf)
    const res = wasm.callFn(fnName, args, fn.args.map(arg => arg.type))

    return res.orDefault(WasmWord.null()).toWasmArg(fn.rtype);
  }

  vmConstructorRemote (from: WasmContainer, pkgIdStrPtr: WasmWord, namePtr: WasmWord, argBufPtr: WasmWord): WasmArg {
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

    return initParams.lowerInto(from).toWasmArg(AbiType.u32());
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

    return from.low.lower(buf.data, AbiType.buffer())
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
