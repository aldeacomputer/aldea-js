import { base16 } from './support/base.js'
import { blake3 } from './support/hash.js'
import { BufReader } from './buf-reader.js'
import { BufWriter } from './buf-writer.js'
import { Instruction, InstructionSerializer, OpCode } from './instruction.js'
import { Serializable } from './serializable.js'
import {Address} from "./address.js";
import {SignInstruction} from "./instructions/index.js";
import {PubKey} from "./pubkey.js";

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

  isSignedBy (addr: Address): boolean {
    return this.instructions
      .filter((inst: Instruction) => inst instanceof SignInstruction)
      .some((inst: Instruction) => {
        const signInst = inst as SignInstruction
        return PubKey.fromBytes(signInst.pubkey).toAddress().equals(addr)
      })
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

/**
 * Checks the given argument is a Transaction.
 */
 export function isTx(tx: any): boolean {
  return tx instanceof Tx
}

/**
 * Tx Serializer object - implements the Serializable interface.
 */
export const TxSerializer: Serializable<Tx> = {
  read(buf: BufReader): Tx {
    const version = buf.readU16()
    const instructions = new Array<Instruction>(buf.readVarInt() as number)
    for (let i = 0; i < instructions.length; i++) {
      instructions[i] = buf.read<Instruction>(InstructionSerializer)
    }
    return new Tx(version, instructions)
  },

  write(buf: BufWriter, tx: Tx): BufWriter {
    buf.writeU16(tx.version)
    buf.writeVarInt(tx.instructions.length)
    for (let i = 0; i < tx.instructions.length; i++) {
      buf.write<Instruction>(InstructionSerializer, tx.instructions[i])
    }
    return buf
  }
}
