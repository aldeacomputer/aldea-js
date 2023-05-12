import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

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

/**
 * Lock Args Serializer object - implements the Serializable interface.
 */
export const LockArgsSerializer: Serializable<LockInstruction> = {
  read(buf: BufReader): LockInstruction {
    const idx = buf.readU16()
    const pubkeyHash = buf.readFixedBytes(20)
    return new LockInstruction(idx, pubkeyHash)
  },

  write(buf: BufWriter, instruction: LockInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeFixedBytes(instruction.pubkeyHash)
    return buf
  }
}
