import {base16} from './support/base.js'
import {blake3} from './support/hash.js'
import {BufReader} from './buf-reader.js'
import {BufWriter} from './buf-writer.js'
import {Instruction, OpCode} from './instruction.js'
import {Address} from "./address.js";
import {SignInstruction, SignToInstruction} from "./instructions/index.js";
import {PubKey} from "./pubkey.js";
import {PrivKey} from "./privkey.js";
import {sign} from "./support/ed25519.js";
import {TxSerializer} from "./internal.js";
import {InstructionSerializer} from "./serializers/instruction-serializer.js";

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
    const buf = new BufReader(bytes)
    return buf.read<Tx>(TxSerializer)
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
  createSignature (privKey: PrivKey, to: number = -1): Uint8Array {
    const msg = this.sighash(to)
    return sign(msg, privKey)
  }

  /**
   * Returns the sighash of the current transaction. Can optionally be passed
   * an index to return the sighash upto a given instruction.
   */
  sighash(to: number = -1): Uint8Array {
    const buf = new BufWriter()
    const instructions = this.instructions
      .filter(i => i.opcode !== OpCode.SIGN && i.opcode !== OpCode.SIGNTO)
      .slice(0, to)
    
    for (let i = 0; i < instructions.length; i++) {
      buf.write<Instruction>(InstructionSerializer, instructions[i])
    }

    return blake3(buf.data)
  }

  isSignedBy (addr: Address, index: number): boolean {
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
    const buf = new BufWriter()
    buf.write<Tx>(TxSerializer, this)
    return buf.data
  }

  /**
   * Returns the Transaction as hex-encoded string.
   */
  toHex(): string {
    return base16.encode(this.toBytes())
  }
}

