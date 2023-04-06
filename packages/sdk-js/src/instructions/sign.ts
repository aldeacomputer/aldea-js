import {Instruction, OpCode} from '../internal.js'

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

