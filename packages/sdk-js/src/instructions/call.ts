import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable,
} from '../internal.js'

/**
 * Call Instruction.
 * 
 * Calls an instance method on a Jig. Args are passwed to the constructor.
 */
export class CallInstruction extends Instruction {
  idx: number;
  methodIdx: number;
  argsBuf: Uint8Array;

  constructor(idx: number, methodIdx: number, argsBuf: Uint8Array) {
    super(OpCode.CALL)
    this.idx = idx
    this.methodIdx = methodIdx
    this.argsBuf = argsBuf
  }
}

/**
 * Call Args Serializer object - implements the Serializable interface.
 */
export const CallArgsSerializer: Serializable<CallInstruction> = {
  read(buf: BufReader): CallInstruction {
    const idx = buf.readU16()
    const methodIdx = buf.readU16()
    const argsBuf = buf.readBytes(buf.remaining)
    return new CallInstruction(idx, methodIdx, argsBuf)
  },

  write(buf: BufWriter, instruction: CallInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.methodIdx)
    buf.writeBytes(instruction.argsBuf)
    return buf
  }
}
