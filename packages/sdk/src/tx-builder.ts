import {
  Address,
  BCS,
  HDPrivKey,
  Instruction,
  InstructionRef,
  OpCode,
  Pointer,
  PrivKey,
  Tx,
  base16,
  ed25519,
  ref,
  util,
} from '@aldea/core'

import {
  Abi,
  ClassNode,
  FunctionNode,
  ImportNode,
  TypeNode,
  findClass,
  findFunction,
  findImport,
  findMethod,
} from '@aldea/core/abi'

import {
  CallInstruction,
  DeployInstruction,
  ExecFuncInstruction,
  ExecInstruction,
  FundInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  SignInstruction,
  SignToInstruction,
} from '@aldea/core/instructions'

import { Aldea } from './aldea.js'

/**
 * Build step function that must return an Instruction to append to the built
 * transaction.
 */
export type TxBuildStep = (txb: TxBuilder, ...userArgs: any[]) => Instruction | Promise<Instruction>

/**
 * Build hook function that can intercept an instruction and mutate it. It must
 * return the same Instruction type.
 */
export type TxBuildHook = (txb: TxBuilder, instruction: Instruction, idx: number) => void | Instruction | Promise<Instruction | void>

/**
 * Options that can be passed to the TxBuilder instance.
 * 
 * - `extend` - optional previous transaction to extend from
 * - `onBuild` - hook or array of hooks to manipulate an instruction as it is built in sequence
 * - `afterBuild` - hook or array of hooks to manipulate an instruction after it is built
 * - `updateSigs` - key or array of keys to resign any SIGN instructions. Use in combination with `extend`
 */
export interface TxBuilderOpts {
  extend?: Tx;
  onBuild?: TxBuildHook | Array<TxBuildHook>;
  afterBuild?: TxBuildHook | Array<TxBuildHook>;
  updateSigs?: PrivKey | HDPrivKey | Array<PrivKey | HDPrivKey>;
}

/**
 * Transaction Builder
 * 
 * A simple API for building transactions.
 */
export class TxBuilder {
  private aldea: Aldea;
  private buildSteps = new Array<[TxBuildStep, any[]]>();
  private buildHooks = new Array<TxBuildHook>();
  private afterHooks = new Array<TxBuildHook>();
  private results = new Array<InstructionResult>();
  private isBuilding: boolean = false
  private _tx = new Tx()

  constructor(aldea: Aldea, opts: TxBuilderOpts = {}) {
    this.aldea = aldea
    if (opts.extend) {
      for (let instruction of opts.extend.instructions) {
        this.push(instruction)
      }
    }
    if (opts.onBuild) {
      for (let hook of Array.isArray(opts.onBuild) ? opts.onBuild : [opts.onBuild]) {
        this.buildHooks.push(hook)
      }
    }
    if (opts.afterBuild) {
      for (let hook of Array.isArray(opts.afterBuild) ? opts.afterBuild : [opts.afterBuild]) {
        this.afterHooks.push(hook)
      }
    }
    if (opts.updateSigs) {
      for (let privKey of Array.isArray(opts.updateSigs) ? opts.updateSigs : [opts.updateSigs]) {
        this.afterHooks.push(createSigHook(privKey, opts.extend?.instructions.length))
      }
    }
  }

  /**
   * Builds the transaction. Executes the build steps and returns the Tx.
   */
  async build(): Promise<Tx> {
    this.refuteBuilding('build')
    this.isBuilding = true
    this._tx = new Tx()
    this.results = []

    for (let i = 0; i < this.buildSteps.length; i++) {
      const txid = this._tx.id
      const [step, args] = this.buildSteps[i]
      const instruction = await this.applyHooks(this.buildHooks, step(this, ...args), i)
      this.refuteMutation(txid)
      this._tx.push(instruction)
      this.results[i] = await this.resultFromInstruction(instruction)
    }

    for (let i = 0; i < this._tx.instructions.length; i++) {
      if (this._tx.instructions[i].opcode === OpCode.SIGN) {
        const inst = this._tx.instructions[i] as SignInstruction
        const [privKey] = this.buildSteps[i][1]
        if ((privKey instanceof PrivKey || privKey instanceof HDPrivKey) && inst.sig.every(b => b === 0)) {
          this._tx.instructions[i] = TxBuilder.signInstruction(this, privKey)
        }
      }
      this._tx.instructions[i] = await this.applyHooks(this.afterHooks, this._tx.instructions[i], i)
    }

    this.isBuilding = false
    return this._tx
  }

  /**
   * Gets an InstructionResult from the stack of results.
   */
  getResult(ref: InstructionRef, type: ResultType): InstructionResult {
    const res = this.results[ref.idx]
    if (!res) {
      throw new Error(`intruction result not found: ${ref.idx}`)
    } else if (res.type !== type) {
      const expected = ResultType[type]
      const actual = ResultType[res.type]
      throw new Error(`wrong instruction result: ${expected} expected, got ${actual}`)
    }
    return res
  }

  /**
   * Returns the transaction being built. Can only be accessed during building.
   */
  get tx(): Tx {
    if (!this.isBuilding) throw new Error('TxBuilder.tx can only be accessed during build')
    return this._tx
  }

  // DEPRECATED
  concat(tx: Tx): TxBuilder {
    console.warn('TxBuilder#concat is deprecated. Use `new TxBuilder(aldea, { extend: Tx })`')
    for (let instruction of tx.instructions) {
      this.push(instruction)
    }
    return this
  }

  /**
   * Pushes an IMPORT instruction onto the Transaction.
   */
  import(pkgId: string | Uint8Array): InstructionRef {
    if (typeof pkgId === 'string') pkgId = base16.decode(pkgId)
    return this.push(TxBuilder.importInstruction, pkgId)
  }

  /**
   * Pushes a LOAD instruction onto the Transaction.
   */
  load(outputId: string | Uint8Array): InstructionRef {
    if (typeof outputId === 'string') outputId = base16.decode(outputId)
    return this.push(TxBuilder.loadInstruction, outputId)
  }

  /**
   * Pushes a LOADBYORIGIN instruction onto the Transaction.
   */
  loadByOrigin(origin: string | Pointer): InstructionRef {
    if (typeof origin === 'string') origin = Pointer.fromString(origin)
    return this.push(TxBuilder.loadByOriginInstruction, origin)
  }

  /**
   * Pushes a NEW instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a PkgResult), a class name and a list of args.
   */
  new(ref: InstructionRef, className: string, args: any[] = []): InstructionRef {
    return this.push(TxBuilder.newInstruction, ref, className, args)
  }

  /**
   * Pushes a CALL instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a JigResult), a method name and a list of args.
   */
  call(ref: InstructionRef, methodName: string, args: any[] = []): InstructionRef {
    return this.push(TxBuilder.callInstruction, ref, methodName, args)
  }

  /**
   * Pushes an EXEC instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a PkgResult), a class name and static method name,
   * and a list of args.
   */
  exec(ref: InstructionRef, className: string, methodName: string, args: any[] = []): InstructionRef {
    return this.push(TxBuilder.execInstruction, ref, className, methodName, args)
  }

  /**
   * Pushes an EXECFUNC instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a PkgResult), a function name and a list of args.
   */
  execFunc(ref: InstructionRef, functionName: string, args: any[] = []): InstructionRef {
    return this.push(TxBuilder.execFuncInstruction, ref, functionName, args)
  }

  /**
   * Pushes a FUND instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a JigResult).
   */
  fund(ref: InstructionRef): InstructionRef {
    return this.push(TxBuilder.fundInstruction, ref)
  }

  /**
   * Pushes a LOCK instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a JigResult), and an address instance of string.
   */
  lock(ref: InstructionRef, address: Address | string): InstructionRef {
    if (typeof address === 'string') address = Address.fromString(address)
    return this.push(TxBuilder.lockInstruction, ref, address)
  }

  /**
   * Pushes a DEPLOY instruction onto the Transaction.
   */
  deploy(code: Map<string, string>): InstructionRef;
  deploy(entry: string | string[], code: Map<string, string>): InstructionRef;
  deploy(entryOrCode: string | string[] | Map<string, string>, code?: Map<string, string>): InstructionRef {
    let entry: string[]
    let pkg: Map<string, string>
    if (code instanceof Map) {
      entry = Array.isArray(entryOrCode) ? entryOrCode : [entryOrCode] as string[]
      pkg = code
    } else if (entryOrCode instanceof Map) {
      entry = Array.from(entryOrCode.keys())
      pkg = entryOrCode
    } else {
      throw new Error('invalid deploy params')
    }
    return this.push(TxBuilder.deployInstruction, entry, pkg)
  }

  /**
   * Pushes a SIGN instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  sign(privKey: PrivKey | HDPrivKey): InstructionRef {
    return this.push(TxBuilder.signInstruction, privKey, true)
  }

  /**
   * Pushes a SIGNTO instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  signTo(privKey: PrivKey | HDPrivKey): InstructionRef {
    return this.push(TxBuilder.signToInstruction, privKey)
  }

  /**
   * Pushes a build step onto the stack of steps. The build step must return an
   * instruction.
   */
  push(instruction: Instruction | TxBuildStep, ...args: any[]): InstructionRef {
    this.refuteBuilding('push')
    const step = typeof instruction === 'function' ? instruction : () => instruction
    const len = this.buildSteps.push([step, args])
    return ref(len - 1)
  }

  // Applies the list of hooks on the given instruction.
  private async applyHooks(hooks: TxBuildHook[], instruction: Instruction | Promise<Instruction>, idx: number): Promise<Instruction> {
    return hooks.reduce(async (instP, hook) => {
      const inst = await instP
      const repl = await hook(this, inst, idx)
      if (typeof repl?.opcode === 'number') {
        if (repl.opcode !== inst.opcode) {
          throw new Error(`TxBuilder hook instruction mismatch. ${OpCode[inst.opcode]} expected, ${OpCode[repl.opcode]} received.`)
        }
        return repl
      }
      return inst
    }, instruction)
  }

  // Returns the instruction result for the given instruction.
  private async resultFromInstruction(instruction: Instruction): Promise<InstructionResult> {
    switch(instruction.opcode) {
      case OpCode.IMPORT: {
        const i = instruction as ImportInstruction
        const pkgId = base16.encode(i.pkgId)
        const abi = await this.aldea.getPackageAbi(pkgId)
        return pkgResult(abi)
      }
      case OpCode.LOAD: {
        const i = instruction as LoadInstruction
        const outputId = base16.encode(i.outputId)
        const output = await this.aldea.getOutput(outputId)
        const pkgPtr = Pointer.fromString(output.class)
        const abi = await this.aldea.getPackageAbi(pkgPtr.id)
        return jigResult(abi, pkgPtr.idx)
      }
      case OpCode.LOADBYORIGIN: {
        const i = instruction as LoadByOriginInstruction
        const origin = Pointer.fromBytes(i.origin)
        const output = await this.aldea.getOutputByOrigin(origin.toString())
        const pkgPtr = Pointer.fromString(output.class)
        const abi = await this.aldea.getPackageAbi(pkgPtr.id)
        return jigResult(abi, pkgPtr.idx)
      }
      case OpCode.NEW: {
        const i = instruction as NewInstruction
        const res = this.getResult(ref(i.idx), ResultType.PKG) as PkgResult
        return jigResult(res.abi, i.exportIdx)
      }
      case OpCode.CALL: {
        const i = instruction as CallInstruction
        const res = this.getResult(ref(i.idx), ResultType.JIG) as JigResult
        const klass = res.abi.exports[res.exportIdx].code as ClassNode
        const rtype = klass.methods[i.methodIdx].rtype
        return this.resultFromReturnType(res.abi, rtype)
      }
      case OpCode.EXEC: {
        const i = instruction as ExecInstruction
        const res = this.getResult(ref(i.idx), ResultType.PKG) as PkgResult
        const klass = res.abi.exports[i.exportIdx].code as ClassNode
        const rtype = klass.methods[i.methodIdx].rtype
        return this.resultFromReturnType(res.abi, rtype)
      }
      case OpCode.EXECFUNC: {
        const i = instruction as ExecFuncInstruction
        const res = this.getResult(ref(i.idx), ResultType.PKG) as PkgResult
        const func = res.abi.exports[i.exportIdx].code as FunctionNode
        return this.resultFromReturnType(res.abi, func.rtype)
      }
      case OpCode.FUND:
        return noResult()
      case OpCode.LOCK:
        return noResult()
      case OpCode.DEPLOY:
        // todo - can return a PkgResult if we compile the code here and get the ABI?
        return noResult()
      case OpCode.SIGN:
        return noResult()
      case OpCode.SIGNTO:
        return noResult()
      default:
        throw new Error(`unrecognized instruction opcode: ${instruction.opcode}`)
    }
  }

  // Returns a typed instruction result from a method/function call
  private async resultFromReturnType(abi: Abi, rtype: TypeNode | null): Promise<InstructionResult> {
    if (rtype) {
      let exported: ClassNode | void
      let imported: ImportNode | void

      if (rtype.name === 'Coin') {
        const coinAbi = await this.aldea.getPackageAbi('0000000000000000000000000000000000000000000000000000000000000000')
        const klass = findClass(coinAbi, 'Coin', `class not found: Coin`)
        const exportIdx = coinAbi.exports.findIndex(e => e.code === klass)
        return jigResult(coinAbi, exportIdx)
      }

      if (exported = findClass(abi, rtype.name)) {
        const exportIdx = abi.exports.findIndex(e => e.code === exported)
        return jigResult(abi, exportIdx)
      }
      
      if (imported = findImport(abi, rtype.name)) {
        const remoteAbi = await this.aldea.getPackageAbi(imported.pkg)
        const klass = findClass(remoteAbi, imported.name, `class not found: ${ imported.name }`)
        const exportIdx = remoteAbi.exports.findIndex(e => e.code === klass)
        return jigResult(remoteAbi, exportIdx)
      }
    }

    // todo - can return a "typed result" when we know the type
    return noResult()
  }

  // Throws if the TxBuilder is currently building
  private refuteBuilding(name?: string) {
    if (this.isBuilding) {
      name = name ? `TxBuilder.${name}()` : 'TxBuilder method'
      throw new Error(`cannot call ${name} whilst is building`)
    }
  }

  // Throws if the txid does not match the tx being built
  private refuteMutation(txid: string) {
    if (this.tx.id !== txid) {
      throw new Error('cannot mutate the Tx object whilst TxBuilder is building')
    }
  }
}



/**
 * The TxBuilder namespace also exports a number of static functions for
 * creating individual instructions. These are used internally by the TxBuilder
 * but exposed as can be useful when overriding and customising the TxBuilder.
 */
export namespace TxBuilder {
  /**
   * Creates and returns an IMPORT instruction.
   */
  export function importInstruction(_txb: TxBuilder, pkgId: Uint8Array): ImportInstruction {
    return new ImportInstruction(pkgId)
  }

  /**
   * Creates and returns a LOAD instruction.
   */
  export function loadInstruction(_txb: TxBuilder, outputId: Uint8Array): LoadInstruction {
    return new LoadInstruction(outputId)
  }

  /**
   * Creates and returns a LOADBYORIGIN instruction.
   */
  export function loadByOriginInstruction(_txb: TxBuilder, origin: Pointer): LoadByOriginInstruction {
    return new LoadByOriginInstruction(origin.toBytes())
  }

  /**
   * Creates and returns a NEW instruction.
   */
  export function newInstruction(txb: TxBuilder, ref: InstructionRef, className: string, args: any[]): NewInstruction {
    const res = txb.getResult(ref, ResultType.PKG) as PkgResult
    const klass = findClass(res.abi, className, `class not found: ${ className }`)
    const exportIdx = res.abi.exports.findIndex(e => e.code === klass)
    const argsBuf = new BCS(res.abi).encode(`${klass.name}_constructor`, args)
    return new NewInstruction(ref.idx, exportIdx, argsBuf)
  }

  /**
   * Creates and returns a CALL instruction.
   */
  export function callInstruction(txb: TxBuilder, ref: InstructionRef, methodName: string, args: any[]): CallInstruction {
    const res = txb.getResult(ref, ResultType.JIG) as JigResult
    const klass = res.abi.exports[res.exportIdx].code as ClassNode
    const method = findMethod(klass, methodName, `method not found: ${ methodName }`)
    const methodIdx = klass.methods.findIndex(m => m === method)
    const argsBuf = new BCS(res.abi).encode(`${klass.name}$${method.name}`, args)
    return new CallInstruction(ref.idx, methodIdx, argsBuf)
  }

  /**
   * Creates and returns an EXEC instruction.
   */
  export function execInstruction(txb: TxBuilder, ref: InstructionRef, className: string, methodName: string, args: any[]): ExecInstruction {
    const res = txb.getResult(ref, ResultType.PKG) as PkgResult
    const klass = findClass(res.abi, className, `class not found: ${ className }`)
    const method = findMethod(klass, methodName, `method not found: ${ methodName }`)
    const klassIdx = res.abi.exports.findIndex(e => e.code === klass)
    const methodIdx = klass.methods.findIndex(m => m === method)
    const argsBuf = new BCS(res.abi).encode(`${klass.name}_${method.name}`, args)
    return new ExecInstruction(ref.idx, klassIdx, methodIdx, argsBuf)
  }

  /**
   * Creates and returns an EXECFUNC instruction.
   */
  export function execFuncInstruction(txb: TxBuilder, ref: InstructionRef, functionName: string, args: any[]): ExecFuncInstruction {
    const res = txb.getResult(ref, ResultType.PKG) as PkgResult
    const func = findFunction(res.abi, functionName, `function not found: ${ functionName }`)
    const funcIdx = res.abi.exports.findIndex(e => e.code === func)
    const argsBuf = new BCS(res.abi).encode(functionName, args)
    return new ExecFuncInstruction(ref.idx, funcIdx, argsBuf)
  }

  /**
   * Creates and returns a FUND instruction.
   */
  export function fundInstruction(txb: TxBuilder, ref: InstructionRef): FundInstruction {
    txb.getResult(ref, ResultType.JIG) // pull the index to check type
    return new FundInstruction(ref.idx)
  }

  /**
   * Creates and returns a LOCK instruction.
   */
  export function lockInstruction(txb: TxBuilder, ref: InstructionRef, address: Address): LockInstruction {
    txb.getResult(ref, ResultType.JIG) // pull the index to check type
    return new LockInstruction(ref.idx, address.hash)
  }

  /**
   * Creates and returns a DEPLOY instruction.
   */
  export function deployInstruction(_txb: TxBuilder, entry: string[], code: Map<string, string>): DeployInstruction {
    const pkg = BCS.pkg.encode([entry, code])
    return new DeployInstruction(pkg)
  }

  /**
   * Creates and returns a SIGN instruction.
   * 
   * The last arg allows the signature to be fakes with 64 empty bytes. The
   * TxBuilder will fake the signature on first pass, and when the entire TX is
   * built will re-sign and blanked sigs.
   */
  export function signInstruction(txb: TxBuilder, privKey: PrivKey | HDPrivKey, fakeIt: boolean = false): SignInstruction {
    let sig: Uint8Array
    if (fakeIt) {
      sig = new Uint8Array(64)
    } else {
      const msg = txb.tx.sighash()
      sig = ed25519.sign(msg, privKey)
    }
    return new SignInstruction(sig, privKey.toPubKey().toBytes())
  }

  /**
   * Creates and returns a SIGNTO instruction.
   */
  export function signToInstruction(txb: TxBuilder, privKey: PrivKey | HDPrivKey): SignToInstruction {
    const msg = txb.tx.sighash(txb.tx.instructions.length)
    const sig = ed25519.sign(msg, privKey)
    return new SignToInstruction(sig, privKey.toPubKey().toBytes())
  }
}

// Helper for generating a hook function that will resign any signatures that
// match the given private key.
// Only matches SIGN instructions as it should be unnecessary to resign SIGNTO. 
function createSigHook(privKey: PrivKey | HDPrivKey, len?: number): TxBuildHook {
  const pubKey = privKey.toPubKey()
  return function sigHook(txb, instruction, idx) {
    if (
      instruction.opcode === OpCode.SIGN &&
      util.buffEquals((<SignInstruction>instruction).pubkey, pubKey.toBytes()) &&
      (typeof len === 'undefined' || idx < len)
    ) {
      return TxBuilder.signInstruction(txb, privKey)
    }
  }
}

// InstructionResult type
enum ResultType {
  NONE,
  PKG,
  JIG,
}

interface InstructionResult {
  type: ResultType;
}

interface NoResult extends InstructionResult {
  type: ResultType.NONE;
}

interface PkgResult extends InstructionResult {
  type: ResultType.PKG;
  abi: Abi;
}

interface JigResult extends InstructionResult {
  type: ResultType.JIG;
  abi: Abi;
  exportIdx: number;
}

// generates a NoResult
function noResult(): NoResult {
  return { type: ResultType.NONE }
}

// generates a PkgResult
function pkgResult(abi: Abi): PkgResult {
  return { type: ResultType.PKG, abi }
}

// generates a JigResult
function jigResult(abi: Abi, exportIdx: number): JigResult {
  return { type: ResultType.JIG, abi, exportIdx }
}

function isFakedSignInstruction(instruction: Instruction): instruction is SignInstruction {
  return instruction.opcode === OpCode.SIGN && (<SignInstruction>instruction).sig.every(b => b === 0)
}