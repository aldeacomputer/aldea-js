import {base16} from './support/base.js'
import {blake3} from './support/hash.js'
import {Instruction, OpCode} from './instruction.js'
import {Address} from "./address.js";
import {
  CallInstruction, DeployInstruction, ExecFuncInstruction, ExecInstruction, FundInstruction,
  ImportInstruction,
  LoadByOriginInstruction,
  LoadInstruction, LockInstruction, NewInstruction,
  SignInstruction,
  SignToInstruction, UnknownInstruction
} from "./instructions/index.js";
import {PubKey} from "./pubkey.js";
import {PrivKey} from "./privkey.js";
import {sign} from "./support/ed25519.js";
import {TxVisitor} from "./tx-visitor.js";
import {Pointer} from "./pointer.js";
import {TxSerializer} from "./tx-serializer.js";
import {TxParser} from "./tx-parser.js";

const TX_VERSION = 1

/**
 * Aldea Transaction
 *
 * A transaction is simply a list of instructions. When a transaction is
 * processed, the instructions are executed in the order they appear in the
 * transaction.
 *
 * This class is primarily for working with the underlying data structure of
 * a transaction. To build a transaction, use the TxBuilder class instaed.
 */
export class Tx {
  version: number;
  instructions: Instruction[];

  constructor(version: number = TX_VERSION, instructions: Instruction[] = []) {
    this.version = version
    this.instructions = instructions
  }

  /**
   * Transaction ID
   */
  get id(): string {
    return base16.encode(this.hash)
  }

  /**
   * Transaction hash
   */
  get hash(): Uint8Array {
    return blake3(this.toBytes())
  }

  /**
   * Returns a Transaction from the given bytes.
   */
  static fromBytes(bytes: Uint8Array): Tx {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `Tx.fromBytes()` must be a `Uint8Array`')
    }

    return new TxParser(bytes).parse()
  }

  /**
   * Returns a Transaction from the given hex-encoded string.
   */
  static fromHex(str: string): Tx {
    const bytes = base16.decode(str)
    return Tx.fromBytes(bytes)
  }

  /**
   * Pushes an Instruction onto the transaction.
   */
  push(instruction: Instruction): Tx {
    this.instructions.push(instruction)
    return this
  }

  /**
   * Returns a valid signature for the current tx using the given key.
   * @param privKey
   * @param to
   */
  createSignature(privKey: PrivKey, to: number = -1): Uint8Array {
    const msg = this.sighash(to)
    return sign(msg, privKey)
  }

  /**
   * Returns the sighash of the current transaction. Can optionally be passed
   * an index to return the sighash upto a given instruction.
   */
  sighash(to: number = -1): Uint8Array {
    // const buf = new BufWriter()
    //
    // const instructions = this.instructions
    //   .filter(i => i.opcode !== OpCode.SIGN && i.opcode !== OpCode.SIGNTO)
    //   .slice(0, to)
    //
    // for (let i = 0; i < instructions.length; i++) {
    //   buf.write<Instruction>(InstructionSerializer, instructions[i])
    // }
    const sigHash = this
      .filter((inst, i) => inst.opcode !== OpCode.SIGN && inst.opcode !== OpCode.SIGNTO && i < to)
      .toBytes()

    return blake3(sigHash)
  }

  filter (f: (inst: Instruction, i: number) => boolean): Tx {
    const ret = new Tx()
    this.instructions
      .filter(f)
      .forEach(i => ret.push(i))
    return ret
  }

  isSignedBy(addr: Address, index: number): boolean {
    let i = 0
    for (const inst of this.instructions) {
      if (inst instanceof SignInstruction && PubKey.fromBytes(inst.pubkey).toAddress().equals(addr)) {
        return true
      }
      if (inst instanceof SignToInstruction && PubKey.fromBytes(inst.pubkey).toAddress().equals(addr) && index <= i) {
        return true
      }
      i++
    }
    return false
  }

  /**
   * Returns the Transaction as bytes.
   */
  toBytes(): Uint8Array {
    const visitor = new TxSerializer()
    return this.accept(visitor)
  }

  /**
   * Returns the Transaction as hex-encoded string.
   */
  toHex(): string {
    return base16.encode(this.toBytes())
  }

  accept<T>(visitor: TxVisitor<T>): T {
    visitor.visitTxStart(this.version, this.instructions.length)
    this.instructions.forEach(inst => {
      let concrete
      switch (inst.opcode) {
        case OpCode.IMPORT:
          concrete = inst as ImportInstruction
          visitor.visitImport(concrete.pkgId)
          break
        case OpCode.LOAD:
          concrete = inst as LoadInstruction
          visitor.visitLoad(concrete.outputId)
          break
        case OpCode.LOADBYORIGIN:
          concrete = inst as LoadByOriginInstruction
          visitor.visitLoadByOrigin(Pointer.fromBytes(concrete.origin))
          break
        case OpCode.NEW:
          concrete = inst as NewInstruction
          visitor.visitNew(concrete.idx, concrete.exportIdx, concrete.args)
          break
        case OpCode.CALL:
          concrete = inst as CallInstruction
          visitor.visitCall(concrete.idx, concrete.methodIdx, concrete.args)
          break
        case OpCode.EXEC:
          concrete = inst as ExecInstruction
          visitor.visitExec(concrete.idx, concrete.exportIdx, concrete.methodIdx, concrete.args)
          break
        case OpCode.EXECFUNC:
          concrete = inst as ExecFuncInstruction
          visitor.visitExecFunc(concrete.idx, concrete.exportIdx, concrete.args)
          break
        case OpCode.FUND:
          concrete = inst as FundInstruction
          visitor.visitFund(concrete.idx)
          break
        case OpCode.LOCK:
          concrete = inst as LockInstruction
          visitor.visitLock(concrete.idx, new Address(concrete.pubkeyHash))
          break
        case OpCode.DEPLOY:
          concrete = inst as DeployInstruction
          visitor.visitDeploy(concrete.entry, concrete.code)
          break
        case OpCode.SIGN:
          concrete = inst as SignInstruction
          visitor.visitSign(concrete.sig, PubKey.fromBytes(concrete.pubkey))
          break
        case OpCode.SIGNTO:
          concrete = inst as SignToInstruction
          visitor.visitSignTo(concrete.sig, PubKey.fromBytes(concrete.pubkey))
          break
        default:
          concrete = inst as UnknownInstruction
          visitor.visitUnknown(inst.opcode, concrete.argsBuf)
          break
      }
    })
    return visitor.visitTxEnd()
  }
}
