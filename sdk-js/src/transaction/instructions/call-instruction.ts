import {Instruction} from "./instruction.js";
import {Argument} from "../arguments/argument.js";
import {TxVisitor} from "../tx-visitor.js";


export class CallInstruction implements Instruction {
  varName: string
  methodName: string
  args: Array<Argument>

  constructor (varName: string, methodName: string, args: Array<Argument>) {
    this.varName = varName
    this.methodName = methodName
    this.args = args
  }

  accept (visitor: TxVisitor): void {
    this.args.forEach(arg => arg.accept(visitor))
    visitor.visitCall(this.varName, this.methodName)
  }
}

