import { CBOR, Sequence } from 'cbor-redux'
import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable,
  refTagger,
  refUntagger,
} from '../internal.js'

/**
 * Exec Instruction.
 * 
 * Calls a static method on a class. Args are passwed to the constructor.
 */
export class ExecFuncInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  args: any[];

  constructor(idx: number, exportIdx: number, args: any[]) {
    super(OpCode.EXECFUNC)
    this.idx = idx
    this.exportIdx = exportIdx
    this.args = args
  }
}

/**
 * Exec Args Serializer object - implements the Serializable interface.
 */
export const ExecFuncArgsSerializer: Serializable<ExecFuncInstruction> = {
  read(buf: BufReader): ExecFuncInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, { mode: 'sequence' })
    
    return new ExecFuncInstruction(idx, exportIdx, args.data)
  },

  write(buf: BufWriter, instruction: ExecFuncInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
