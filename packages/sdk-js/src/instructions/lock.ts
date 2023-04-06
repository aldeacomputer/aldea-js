import {Instruction, OpCode} from '../internal.js'

/**
 * Lock Instruction.
 * 
 * Locks a instance to the given pubkeyHash.
 */
export class LockInstruction extends Instruction {
  idx: number;
  pubkeyHash: Uint8Array;

  constructor(idx: number, pubkeyHash: Uint8Array) {
    super(OpCode.LOCK)
    this.idx = idx
    this.pubkeyHash = pubkeyHash
  }
}

