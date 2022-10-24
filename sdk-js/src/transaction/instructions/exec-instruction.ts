import {Instruction} from "./instruction.js";
import {Argument} from "../arguments/argument.js";
import {TxVisitor} from "../tx-visitor.js";


export class ExecInstruction implements Instruction {
  varName: string
  moduleId: string
  methodName: string
  args: Array<Argument>

  constructor (varName: string, moduleId: string, methodName: string, args: Array<Argument>) {
    this.varName = varName
    this.moduleId = moduleId
    this.methodName = methodName
    this.args = args
  }

  accept(visitor: TxVisitor): void {
    this.args.forEach(arg => arg.accept(visitor))
    visitor.visitExec(this.varName, this.moduleId, this.methodName)
  }
}
