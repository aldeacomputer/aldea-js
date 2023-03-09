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
 * Call Instruction.
 * 
 * Calls an instance method on a Jig. Args are passwed to the constructor.
 */
export class CallInstruction extends Instruction {
  idx: number;
  methodIdx: number;
  args: any[];

  constructor(idx: number, methodIdx: number, args: any[]) {
    super(OpCode.CALL)
    this.idx = idx
    this.methodIdx = methodIdx
    this.args = args
  }
}

/**
 * Call Args Serializer object - implements the Serializable interface.
 */
export const CallArgsSerializer: Serializable<CallInstruction> = {
  read(buf: BufReader): CallInstruction {
    const idx = buf.readU16()
    const methodIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, { mode: 'sequence' })
    
    return new CallInstruction(idx, methodIdx, args.data)
  },

  write(buf: BufWriter, instruction: CallInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.methodIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
