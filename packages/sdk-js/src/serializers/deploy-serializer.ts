import {Serializable} from "../serializable.js";
import {DeployInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {CBOR, Sequence} from "cbor-redux";
import {BufWriter} from "../buf-writer.js";

/**
 * Deploy Args Serializer object - implements the Serializable interface.
 */
export const DeployArgsSerializer: Serializable<DeployInstruction> = {
  read(buf: BufReader): DeployInstruction {
    const cborData = buf.readBytes(buf.remaining)

    const cborDataBuf = cborData.buffer.slice(cborData.byteOffset, cborData.byteOffset + cborData.byteLength)
    const args = CBOR.decode(cborDataBuf, null, {mode: 'sequence', dictionary: 'map'})

    return new DeployInstruction(args.data[0], args.data[1])
  },

  write(buf: BufWriter, inst: DeployInstruction): BufWriter {
    const cborData = CBOR.encode(new Sequence([inst.entry.sort(), inst.code]))
    buf.writeBytes(new Uint8Array(cborData))
    return buf
  }
}
