import {
  Instruction,
  OpCode
} from '../internal.js'

/**
 * Fund Instruction.
 * 
 * Marks a Coin UTXO to be used for the transaction fee. All of the coin's
 * motos will be consumed and the coin will be destroyed.
 */
export class FundInstruction extends Instruction {
  idx: number;

  constructor(idx: number) {
    super(OpCode.FUND)
    this.idx = idx
  }
}
