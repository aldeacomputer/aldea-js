import {
  BufReader,
  BufWriter,
  Instruction,
  OpCode,
  Serializable
} from '../internal.js'

/**
 * Load By Ref Instruction.
 * 
 * Loads an instance by the given Jig Ref.
 */
export class LoadInstruction extends Instruction {
  outputId: Uint8Array;

  constructor(outputId: Uint8Array) {
    super(OpCode.LOAD)
    this.outputId = outputId
  }
}

/**
 * Load Args Serializer object - implements the Serializable interface.
 */
export const LoadArgsSerializer: Serializable<LoadInstruction> = {
  read(buf: BufReader): LoadInstruction {
    const outputId = buf.readBytes(32)
    return new LoadInstruction(outputId)
  },

  write(buf: BufWriter, instruction: LoadInstruction): BufWriter {
    buf.writeBytes(instruction.outputId)
    return buf
  }
}
