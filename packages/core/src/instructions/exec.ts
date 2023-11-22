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
 * Calls a static function. Args are passed to the constructor.
 */
export class ExecInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  argsBuf: Uint8Array;

  constructor(idx: number, exportIdx: number, argsBuf: Uint8Array) {
    super(OpCode.EXEC)
    this.idx = idx
    this.exportIdx = exportIdx
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
    const argsBuf = buf.readFixedBytes(buf.remaining)
    return new ExecInstruction(idx, exportIdx, argsBuf)
  },

  write(buf: BufWriter, instruction: ExecInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeFixedBytes(instruction.argsBuf)
    return buf
  }
}
