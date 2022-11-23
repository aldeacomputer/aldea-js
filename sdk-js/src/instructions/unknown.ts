import { Instruction, OpCode } from '../internal.js'

/**
 * Unknown Instruction.
 */
export class UnknownInstruction extends Instruction {
  argsBuf: Uint8Array;

  constructor(opcode: OpCode, argsBuf: Uint8Array) {
    super(opcode)
    this.argsBuf = argsBuf
  }
}
