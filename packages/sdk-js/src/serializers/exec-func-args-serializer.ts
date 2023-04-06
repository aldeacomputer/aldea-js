import {Serializable} from "../serializable.js";
import {ExecFuncInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {CBOR, Sequence} from "cbor-redux";
import {refTagger, refUntagger} from "../instruction.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Exec Args Serializer object - implements the Serializable interface.
 */
export const ExecFuncArgsSerializer: Serializable<ExecFuncInstruction> = {
  read(buf: BufReader): ExecFuncInstruction {
    const idx = buf.readU16()
    const exportIdx = buf.readU16()
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, refUntagger, {mode: 'sequence'})

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
