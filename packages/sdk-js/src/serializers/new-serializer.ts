import {Serializable} from "../serializable.js";
import {NewInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {decodeCbor} from "../instructions/decode-cbor.js";
import {BufWriter} from "../buf-writer.js";
import {CBOR, Sequence} from "cbor-redux";
import {refTagger} from "../instruction.js";

/**
 * New Args Serializer object - implements the Serializable interface.
 */
export const NewArgsSerializer: Serializable<NewInstruction> = {
  read(buf: BufReader): NewInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = decodeCbor(cborDataBuf) //  CBOR.decode(cborDataBuf, refUntagger, { mode: 'sequence' })

    return new NewInstruction(idx, exportIdx, args)
  },

  write(buf: BufWriter, instruction: NewInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence(instruction.args), refTagger)
    buf.writeU16(instruction.idx)
    buf.writeU16(instruction.exportIdx)
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
