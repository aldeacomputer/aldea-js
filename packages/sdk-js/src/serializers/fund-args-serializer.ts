import {Serializable} from "../serializable.js";
import {FundInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Fund Args Serializer object - implements the Serializable interface.
 */
export const FundArgsSerializer: Serializable<FundInstruction> = {
  read(buf: BufReader): FundInstruction {
    const idx = buf.readU16()
    return new FundInstruction(idx)
  },

  write(buf: BufWriter, instruction: FundInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    return buf
  }
}
