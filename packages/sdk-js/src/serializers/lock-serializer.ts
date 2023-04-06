import {Serializable} from "../serializable.js";
import {LockInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Lock Args Serializer object - implements the Serializable interface.
 */
export const LockArgsSerializer: Serializable<LockInstruction> = {
  read(buf: BufReader): LockInstruction {
    const idx = buf.readU16()
    const pubkeyHash = buf.readBytes(20)
    return new LockInstruction(idx, pubkeyHash)
  },

  write(buf: BufWriter, instruction: LockInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    buf.writeBytes(instruction.pubkeyHash)
    return buf
  }
}
