import {Serializable} from "../serializable.js";
import {SignInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Sign Args Serializer object - implements the Serializable interface.
 */
export const SignArgsSerializer: Serializable<SignInstruction> = {
  read(buf: BufReader): SignInstruction {
    const sig = buf.readBytes(64)
    const pubkey = buf.readBytes(32)
    return new SignInstruction(sig, pubkey)
  },

  write(buf: BufWriter, instruction: SignInstruction): BufWriter {
    buf.writeBytes(instruction.sig)
    buf.writeBytes(instruction.pubkey)
    return buf
  }
}
