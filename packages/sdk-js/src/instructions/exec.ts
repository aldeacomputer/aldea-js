import {Instruction, OpCode,} from '../internal.js'

/**
 * Exec Instruction.
 *
 * Calls a static method on a class. Args are passwed to the constructor.
 */
export class ExecInstruction extends Instruction {
    idx: number;
    exportIdx: number;
    methodIdx: number;
    args: any[];

    constructor(idx: number, exportIdx: number, methodIdx: number, args: any[]) {
        super(OpCode.EXEC)
        this.idx = idx
        this.exportIdx = exportIdx
        this.methodIdx = methodIdx
        this.args = args
    }
}

