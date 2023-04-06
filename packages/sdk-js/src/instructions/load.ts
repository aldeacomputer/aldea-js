import {
  Instruction,
  OpCode
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
