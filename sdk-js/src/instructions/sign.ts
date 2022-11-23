import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Sign Instruction.
 * 
 * The given signature and pubkey signs ALL the transaction instructions.
 */
export class SignInstruction extends Instruction {
  sig: Uint8Array;
  pubkey: Uint8Array;

  constructor(sig: Uint8Array, pubkey: Uint8Array) {
    super(OpCode.SIGN)
    this.sig = sig
    this.pubkey = pubkey
  }
}

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
