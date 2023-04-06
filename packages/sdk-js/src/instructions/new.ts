import {
  Instruction,
  OpCode
} from '../internal.js'

/**
 * New Instruction.
 * 
 * Instantiates a new instance of a class. Args are passwed to the constructor.
 */
export class NewInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  args: any[];

  constructor(idx: number, exportIdx: number, args: any[]) {
    super(OpCode.NEW)
    this.idx = idx
    this.exportIdx = exportIdx
    this.args = args
  }
}
