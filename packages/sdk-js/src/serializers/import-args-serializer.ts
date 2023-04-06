import {Serializable} from "../serializable.js";
import {ImportInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Import Args Serializer object - implements the Serializable interface.
 */
export const ImportArgsSerializer: Serializable<ImportInstruction> = {
  read(buf: BufReader): ImportInstruction {
    const pkgId = buf.readBytes(32)
    return new ImportInstruction(pkgId)
  },

  write(buf: BufWriter, inst: ImportInstruction): BufWriter {
    buf.writeBytes(inst.pkgId)
    return buf
  }
}
