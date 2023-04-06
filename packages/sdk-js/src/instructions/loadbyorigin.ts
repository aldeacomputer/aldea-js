import {
  Instruction,
  OpCode
} from '../internal.js'

/**
 * Load By Id Instruction.
 * 
 * Loads an instance by the given Jig Id.
 */
export class LoadByOriginInstruction extends Instruction {
  origin: Uint8Array;

  constructor(origin: Uint8Array) {
    super(OpCode.LOADBYORIGIN)
    this.origin = origin
  }
}
