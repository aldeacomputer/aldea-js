import {Serializable} from "../serializable.js";
import {LoadInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Load Args Serializer object - implements the Serializable interface.
 */
export const LoadArgsSerializer: Serializable<LoadInstruction> = {
  read(buf: BufReader): LoadInstruction {
    const outputId = buf.readBytes(32)
    return new LoadInstruction(outputId)
  },

  write(buf: BufWriter, instruction: LoadInstruction): BufWriter {
    buf.writeBytes(instruction.outputId)
    return buf
  }
}
