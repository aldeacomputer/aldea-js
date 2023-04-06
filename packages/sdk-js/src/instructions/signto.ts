import {
  Instruction,
  OpCode
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
