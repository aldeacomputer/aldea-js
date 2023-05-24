import {
  Address,
  BufReader, BufWriter,
  Instruction, InstructionSerializer, OpCode,
  PrivKey, PubKey,
  Serializable,
  SignInstruction, SignToInstruction
} from './internal.js'

import { base16 } from './support/base.js'
import { hash } from './support/blake3.js'
import { sign } from "./support/ed25519.js"

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
    return hash(this.toBytes(), 32)
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
    const instructions = this.instructions.slice(0, to)
    
    for (let i = 0; i < instructions.length; i++) {
      const { opcode } = instructions[i]
      if (opcode === OpCode.SIGN || opcode === OpCode.SIGNTO) {
        buf.writeU8(opcode)
        buf.writeBytes((<SignInstruction | SignToInstruction>instructions[i]).pubkey)
      } else {
        buf.write<Instruction>(InstructionSerializer, instructions[i])
      }
    }

    return hash(buf.data, 32)
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

/**
 * Tx Serializer object - implements the Serializable interface.
 */
export const TxSerializer: Serializable<Tx> = {
  read(buf: BufReader): Tx {
    const version = buf.readU16()
    const instructions = buf.readSeq((reader) => {
      return reader.read<Instruction>(InstructionSerializer)
    })
    return new Tx(version, instructions)
  },

  write(buf: BufWriter, tx: Tx): BufWriter {
    buf.writeU16(tx.version)
    buf.writeSeq(tx.instructions, (writer, inst) => {
      writer.write<Instruction>(InstructionSerializer, inst)
    })
    return buf
  }
}
