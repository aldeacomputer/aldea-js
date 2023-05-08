import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable,
} from '../internal.js'

/**
 * Exec Instruction.
 * 
 * Calls a static method on a class. Args are passwed to the constructor.
 */
export class ExecFuncInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  argsBuf: Uint8Array;

  constructor(idx: number, exportIdx: number, argsBuf: Uint8Array) {
    super(OpCode.EXECFUNC)
    this.idx = idx
    this.exportIdx = exportIdx
    this.argsBuf = argsBuf
  }
}

/**
 * Exec Args Serializer object - implements the Serializable interface.
 */
export const ExecFuncArgsSerializer: Serializable<ExecFuncInstruction> = {
  read(buf: BufReader): ExecFuncInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const argsBuf = buf.readBytes(buf.remaining)
    return new ExecFuncInstruction(idx, exportIdx, argsBuf)
  },

  write(buf: BufWriter, instruction: ExecFuncInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(instruction.argsBuf)
    return buf
  }
}
