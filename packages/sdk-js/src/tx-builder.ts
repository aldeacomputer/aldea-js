import {
  Abi,
  ClassNode,
  findClass,
  findMethod,
  findFunction,
  findImport,
  TypeNode
} from '@aldea/compiler/abi'

import {
  Aldea,
  Address,
  Pointer,
  PrivKey,
  Tx,
  ref,
  InstructionRef,
  CallInstruction,
  ExecInstruction,
  ExecFuncInstruction,
  FundInstruction,
  ImportInstruction,
  LoadInstruction,
  LoadByOriginInstruction,
  LockInstruction,
  DeployInstruction,
  NewInstruction,
  SignInstruction,
  SignToInstruction,
} from './internal.js'

import { base16 } from './support/base.js'
import { sign } from './support/ed25519.js'

/**
 * Transaction Builder
 * 
 * A simple API for building transactions.
 */
export class TxBuilder {
  private aldea: Aldea;
  steps = new Array<BuildStep>();
  results = new Array<InstructionResult>();

  constructor(aldea: Aldea) {
    this.aldea = aldea
  }

  /**
   * Builds the transaction. Executes the build steps and returns the Tx.
   */
  async build(): Promise<Tx> {
    const tx = new Tx()
    this.results = []
    for (let i = 0; i < this.steps.length; i++) {
      this.results[i] = await this.steps[i](tx)
    }
    return tx
  }

  /**
   * Pushes an IMPORT instruction onto the Transaction. Accepts the pkgId as
   * a string.
   */
  import(pkgId: string): InstructionRef {
    return this.push(async (tx: Tx) => {
      const abi = await this.aldea.getPackageAbi(pkgId)

      tx.push(new ImportInstruction(base16.decode(pkgId)))
      return pkgResult(abi)
    })
  }

  /**
   * Pushes a LOAD instruction onto the Transaction. Accepts the output_id as
   * a string.
   */
  load(outputId: string): InstructionRef {
    return this.push(async (tx: Tx) => {
      const output = await this.aldea.getOutput(outputId)
      const pkgPtr = Pointer.fromString(output.class)
      const abi = await this.aldea.getPackageAbi(pkgPtr.id)
      tx.push(new LoadInstruction(base16.decode(outputId)))

      return jigResult(abi, pkgPtr.idx)
    })
  }

  /**
   * Pushes a LOADBYORIGIN instruction onto the Transaction. Accepts the origin
   * as a string.
   */
  loadByOrigin(origin: string): InstructionRef {
    return this.push(async (tx: Tx) => {
      const originPtr = Pointer.fromString(origin)
      const output = await this.aldea.getOutputByOrigin(origin)
      const pkgPtr = Pointer.fromString(output.class)
      const abi = await this.aldea.getPackageAbi(pkgPtr.id)
      tx.push(new LoadByOriginInstruction(originPtr.toBytes()))
      
      return jigResult(abi, pkgPtr.idx)
    })
  }

  /**
   * Pushes a NEW instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a PkgResult), a class name and a list of args.
   */
  new(ref: InstructionRef, className: string, args: any[] = []): InstructionRef {
    return this.push((tx: Tx) => {
      const res = this.pull(ref, ResultType.PKG) as PkgResult
      const klass = findClass(res.abi, className, `class not found: ${ className }`)
      const exportIdx = res.abi.exports.findIndex(e => e.code === klass)

      tx.push(new NewInstruction(ref.idx, exportIdx, args))
      return jigResult(res.abi, exportIdx)
    })
  }

  /**
   * Pushes a CALL instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a JigResult), a method name and a list of args.
   */
  call(ref: InstructionRef, methodName: string, args: any[] = []): InstructionRef {
    return this.push((tx: Tx) => {
      const res = this.pull(ref, ResultType.JIG) as JigResult
      const klass = res.abi.exports[res.exportIdx].code as ClassNode
      const method = findMethod(klass, methodName, `method not found: ${ methodName }`)
      const methodIdx = klass.methods.findIndex(m => m === method)

      tx.push(new CallInstruction(ref.idx, methodIdx, args))
      return this.resultFromReturnType(res.abi, method.rtype)
    })
  }

  /**
   * Pushes an EXEC instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a PkgResult), a static method or function name and a
   * list of args.
   * 
   * If the static name is in the format of `ClassName.methodName` is will
   * attempt to locate the static method. Otherwise it will attempt to locate an
   * exported function.
   */
  exec(ref: InstructionRef, staticName: string, args: any[] = []): InstructionRef {
    return this.push((tx: Tx) => {
      const res = this.pull(ref, ResultType.PKG) as PkgResult
      const parts = staticName.split('.')
      
      switch (parts.length) {
        case 2:
          const [className, methodName] = parts
          const klass = findClass(res.abi, className, `class not found: ${ className }`)
          const method = findMethod(klass, methodName, `method not found: ${ methodName }`)
          const klassIdx = res.abi.exports.findIndex(e => e.code === klass)
          const methodIdx = klass.methods.findIndex(m => m === method)

          tx.push(new ExecInstruction(ref.idx, klassIdx, methodIdx, args))
          return this.resultFromReturnType(res.abi, method.rtype)

        case 1:
          const [funcName] = parts
          const func = findFunction(res.abi, funcName, `function not found: ${ funcName }`)
          const funcIdx = res.abi.exports.findIndex(e => e.code === func)

          tx.push(new ExecFuncInstruction(ref.idx, funcIdx, args))
          return this.resultFromReturnType(res.abi, func.rtype)

        default:
          throw new Error(`invalid static function or method name: ${ staticName }`)
      }
    })
  }

  /**
   * Pushes a FUND instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a JigResult).
   */
  fund(ref: InstructionRef): InstructionRef {
    return this.push((tx: Tx) => {
      this.pull(ref, ResultType.JIG) // pull the index to check type
      tx.push(new FundInstruction(ref.idx))
      return noResult()
    })
  }

  /**
   * Pushes a LOCK instruction onto the Transaction. Accepts an InstructionRef
   * (which must refer to a JigResult), and an address instance of string.
   */
  lock(ref: InstructionRef, address: Address | string): InstructionRef {
    return this.push((tx: Tx) => {
      this.pull(ref, ResultType.JIG) // pull the index to check type
      if (typeof address === 'string') address = Address.fromString(address)
      tx.push(new LockInstruction(ref.idx, address.hash))
      return noResult()
    })
  }

  /**
   * Pushes a DEPLOY instruction onto the Transaction. Accepts a code bundle
   * map of filname => content.
   */
  deploy(code: Map<string, string>): InstructionRef;
  deploy(entry: string | string[], code: Map<string, string>): InstructionRef;
  deploy(entryOrCode: string | string[] | Map<string, string>, code?: Map<string, string>): InstructionRef {
    return this.push((tx: Tx) => {
      let entry: string | string[]
      if (code instanceof Map) {
        entry = entryOrCode as string | string[]
      } else if (entryOrCode instanceof Map) {
        entry = Array.from(entryOrCode.keys())
        code = entryOrCode
      } else {
        throw new Error('invalid deploy params')
      }
      tx.push(new DeployInstruction(entry, code))
      // todo - can return a PkgResult if we compile the code here and get the ABI?
      return noResult()
    })
  }

  /**
   * Pushes a SIGN instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  sign(privKey: PrivKey): InstructionRef {
    return this.push((tx: Tx) => {
      const msg = tx.sighash()
      const sig = sign(msg, privKey)
      tx.push(new SignInstruction(sig, privKey.toPubKey().toBytes()))
      return noResult()
    })
  }

  /**
   * Pushes a SIGNTO instruction onto the Transaction. The given PrivKey is used
   * to create the signature used in the instruction.
   */
  signTo(privKey: PrivKey): InstructionRef {
    return this.push((tx: Tx) => {
      const msg = tx.sighash(tx.instructions.length)
      const sig = sign(msg, privKey)
      tx.push(new SignToInstruction(sig, privKey.toPubKey().toBytes()))
      return noResult()
    })
  }

  // Pushes a build step onto the stack of steps.
  private push(step: BuildStep): InstructionRef {
    const idx = this.steps.push(step) - 1
    return ref(idx)
  }

  // Pulls an InstructionResult from the stack of results.
  private pull(ref: InstructionRef, type: ResultType): InstructionResult {
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

  // Returns a typed instruction result from a method/function call
  private async resultFromReturnType(abi: Abi, rtype: TypeNode | null): Promise<InstructionResult> {
    const exported = rtype && findClass(abi, rtype.name)
    const imported = rtype && findImport(abi, rtype.name)

    if (exported) {
      const exportIdx = abi.exports.findIndex(e => e.code === exported)
      return jigResult(abi, exportIdx)
    }
    if (imported) {
      const remoteAbi = await this.aldea.getPackageAbi(imported.pkg)
      const klass = findClass(remoteAbi, imported.name, `class not found: ${ imported.name }`)
      const exportIdx = remoteAbi.exports.findIndex(e => e.code === klass)
      return jigResult(remoteAbi, exportIdx)
    }

    // todo - can return a "typed result" when we know the type
    return noResult()
  }
}

// BuildStep tyep
type BuildStep = (tx: Tx) => InstructionResult | Promise<InstructionResult>

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
