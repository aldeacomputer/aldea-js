import {
  Instruction,
  OpCode
} from '../internal.js'

/**
 * Call Instruction.
 * 
 * Calls an instance method on a Jig. Args are passwed to the constructor.
 */
export class CallInstruction extends Instruction {
  idx: number;
  methodIdx: number;
  args: any[];

  constructor(idx: number, methodIdx: number, args: any[]) {
    super(OpCode.CALL)
    this.idx = idx
    this.methodIdx = methodIdx
    this.args = args
  }
}
