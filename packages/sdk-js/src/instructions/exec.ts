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
export class ExecInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  methodIdx: number;
  argsBuf: Uint8Array;

  constructor(idx: number, exportIdx: number, methodIdx: number, argsBuf: Uint8Array) {
    super(OpCode.EXEC)
    this.idx = idx
    this.exportIdx = exportIdx
    this.methodIdx = methodIdx
    this.argsBuf = argsBuf
  }
}

/**
 * Exec Args Serializer object - implements the Serializable interface.
 */
export const ExecArgsSerializer: Serializable<ExecInstruction> = {
  read(buf: BufReader): ExecInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const methodIdx = buf.readU16()
    const argsBuf = buf.readBytes(buf.remaining)
    return new ExecInstruction(idx, exportIdx, methodIdx, argsBuf)
  },

  write(buf: BufWriter, instruction: ExecInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeU16(instruction.methodIdx)
    buf.writeBytes(instruction.argsBuf)
    return buf
  }
}
