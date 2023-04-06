import {Instruction, OpCode,} from '../internal.js'

/**
 * Exec Instruction.
 * 
 * Calls a static method on a class. Args are passwed to the constructor.
 */
export class ExecFuncInstruction extends Instruction {
  idx: number;
  exportIdx: number;
  args: any[];

  constructor(idx: number, exportIdx: number, args: any[]) {
    super(OpCode.EXECFUNC)
    this.idx = idx
    this.exportIdx = exportIdx
    this.args = args
  }
}

