import {Serializable} from "../serializable.js";
import {SignToInstruction} from "../instructions/index.js";
import {BufReader} from "../buf-reader.js";
import {BufWriter} from "../buf-writer.js";

/**
 * Sign To Args Serializer object - implements the Serializable interface.
 */
export const SignToArgsSerializer: Serializable<SignToInstruction> = {
  read(buf: BufReader): SignToInstruction {
    const sig = buf.readBytes(64)
    const pubkey = buf.readBytes(32)
    return new SignToInstruction(sig, pubkey)
  },

  write(buf: BufWriter, instruction: SignToInstruction): BufWriter {
    buf.writeBytes(instruction.sig)
    buf.writeBytes(instruction.pubkey)
    return buf
  }
}
