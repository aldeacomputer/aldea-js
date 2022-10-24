import {Instruction} from "./instruction.js";
import {TxVisitor} from "../tx-visitor.js";
import {Argument} from "../arguments/argument.js";

export class NewInstruction implements Instruction {
  private varName: string
  private moduleId: string;
  private className: string;
  private args: Argument[];

  constructor (varName: string, moduleId: string, className: string, args: Argument[]) {
    this.varName = varName
    this.moduleId = moduleId
    this.className = className
    this.args = args
  }

  accept(visitor: TxVisitor): void {
    this.args.forEach(arg => arg.accept(visitor))
    visitor.visitNew(this.varName, this.moduleId, this.className)
  }
}
