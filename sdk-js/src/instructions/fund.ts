import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
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

/**
 * Fund Args Serializer object - implements the Serializable interface.
 */
export const FundArgsSerializer: Serializable<FundInstruction> = {
  read(buf: BufReader): FundInstruction {
    const idx = buf.readU16()
    return new FundInstruction(idx)
  },

  write(buf: BufWriter, instruction: FundInstruction): BufWriter {
    buf.writeU16(instruction.idx)
    return buf
  }
}
