import {Serializable} from "../serializable.js";
import {CallInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {CBOR, Sequence} from "cbor-redux";
import {refTagger, refUntagger} from "../instruction.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Call Args Serializer object - implements the Serializable interface.
 */
export const CallArgsSerializer: Serializable<CallInstruction> = {
  read(buf: BufReader): CallInstruction {
    const idx = buf.readU16()
    const methodIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, {mode: 'sequence'})

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
