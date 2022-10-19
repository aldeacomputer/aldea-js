import {Instruction} from "./instruction.js";
import {Argument} from "../arguments/argument.js";
import {TxVisitor} from "../tx-visitor.js";


export class CallInstruction implements Instruction {
  masterListIndex: number
  methodName: string
  args: Array<Argument>

  constructor (masterListIndex: number, methodName: string, args: Array<Argument>) {
    this.masterListIndex = masterListIndex
    this.methodName = methodName
    this.args = args
  }

  accept(visitor: TxVisitor): void {
    this.args.forEach(arg => arg.accept(visitor))
    visitor.visitCall(this.masterListIndex, this.methodName)
  }
}

