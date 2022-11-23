import { CBOR, Sequence } from 'cbor-redux'
import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * New Instruction.
 * 
 * Instantiates a new instance of a class. Args are passwed to the constructor.
 */
 export class NewInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  args: any[];

  constructor(idx: number, exportIdx: number, args: any[]) {
    super(OpCode.NEW)
    this.idx = idx
    this.exportIdx = exportIdx
    this.args = args
  }
}

/**
 * New Args Serializer object - implements the Serializable interface.
 */
export const NewArgsSerializer: Serializable<NewInstruction> = {
  read(buf: BufReader): NewInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, null, { mode: 'sequence' })
    
    return new NewInstruction(idx, exportIdx, args.data)
  },

  write(buf: BufWriter, instruction: NewInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args))
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
