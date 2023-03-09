import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Sign To Instruction.
 * 
 * The given signature and pubkey signs the transaction instructions before this
 * instruction.
 */
export class SignToInstruction extends Instruction {
  sig: Uint8Array;
  pubkey: Uint8Array;

  constructor(sig: Uint8Array, pubkey: Uint8Array) {
    super(OpCode.SIGNTO)
    this.sig = sig
    this.pubkey = pubkey
  }
}

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
