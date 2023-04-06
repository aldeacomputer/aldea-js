import {Serializable} from "../serializable.js";
import {LoadByOriginInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Load By Origin Args Serializer object - implements the Serializable interface.
 */
export const LoadByOriginArgsSerializer: Serializable<LoadByOriginInstruction> = {
  read(buf: BufReader): LoadByOriginInstruction {
    const origin = buf.readBytes(36)
    return new LoadByOriginInstruction(origin)
  },

  write(buf: BufWriter, instruction: LoadByOriginInstruction): BufWriter {
    buf.writeBytes(instruction.origin)
    return buf
  }
}
