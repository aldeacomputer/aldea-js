import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable,
} from '../internal.js'

/**
 * New Instruction.
 * 
 * Instantiates a new instance of a class. Args are passwed to the constructor.
 */
 export class NewInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  argsBuf: Uint8Array;

  constructor(idx: number, exportIdx: number, argsBuf: Uint8Array) {
    super(OpCode.NEW)
    this.idx = idx
    this.exportIdx = exportIdx
    this.argsBuf = argsBuf
  }
}

/**
 * New Args Serializer object - implements the Serializable interface.
 */
export const NewArgsSerializer: Serializable<NewInstruction> = {
  read(buf: BufReader): NewInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const argsBuf = buf.readBytes(buf.remaining)
    return new NewInstruction(idx, exportIdx, argsBuf)
  },

  write(buf: BufWriter, instruction: NewInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(instruction.argsBuf)
    return buf
  }
}
