import {Sequence, TaggedValue} from 'cbor-redux'
import {BufReader, BufWriter} from './internal.js'
import {InstructionSerializer} from "./internal.js";

const REF_CBOR_TAG = 42

/**
 * All OpCode bytes.
 */
export enum OpCode {
  // Loading
  IMPORT = 0xA1,
  LOAD = 0xA2,
  LOADBYORIGIN = 0xA3,
  // Calling
  NEW = 0xB1,
  CALL = 0xB2,
  EXEC = 0xB3,
  EXECFUNC = 0xB4,
  // Output
  FUND = 0xC1,
  LOCK = 0xC2,
  // Code
  DEPLOY = 0xD1,
  // Cryptography
  SIGN = 0xE1,
  SIGNTO = 0xE2,
}

/**
 * Instruction base class.
 * 
 * An Instruction is Aldea's smallest contiguous unit of execution. A
 * transaction consists of a `OpCode` byte and a number of arguments, depending
 * on the `OpCode`.
 */
export class Instruction {
  opcode: OpCode;

  constructor(opcode: OpCode) {
    this.opcode = opcode
  }

  static fromBytes(bytes: Uint8Array): Instruction {
    const buf = new BufReader(bytes)
    return buf.read<Instruction>(InstructionSerializer)
  }

  toBytes(): Uint8Array {
    const buf = new BufWriter()
    buf.write<Instruction>(InstructionSerializer, this)
    return buf.data
  }
}

/**
 * InstructionRef class - just a wrapper around number
 */
export class InstructionRef {
  idx: number;

  constructor(idx: number) {
    if (!Number.isInteger(idx)) throw new Error('invalid ref. must be an integer.')
    this.idx = idx
  }
}

/**
 * Wrap a number with InstructionRef
 */
export function ref(idx: number): InstructionRef {
  return new InstructionRef(idx)
}

/**
 * Tags an InstructionRef for CBOR encoding
 */
export function refTagger(_key: any, val: any): any {
  if (val instanceof InstructionRef) {
    return new TaggedValue(val.idx, REF_CBOR_TAG)
  } else if (val instanceof Sequence) {
    return new Sequence(val.data.map((val, i) => refTagger(i, val)))
  } else {
    return val
  }
}

/**
 * Untags an InstructionRef from deocded CBOR
 */
export function refUntagger(_key: any, val: any): any {
  if (val instanceof TaggedValue && val.tag === REF_CBOR_TAG) {
    return new InstructionRef(val.value)
  } else {
    return val
  }
}

