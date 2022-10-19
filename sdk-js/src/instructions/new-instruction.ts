import {Instruction} from "./instruction.js";
import {TxVisitor} from "./tx-visitor.js";
import {Argument} from "../arguments/argument.js";

export class NewInstruction implements Instruction {
  private moduleId: string;
  private className: string;
  private args: Argument[];

  constructor (moduleId: string, className: string, args: Argument[]) {
    this.moduleId = moduleId
    this.className = className
    this.args = args
  }

  accept(visitor: TxVisitor): void {
    this.args.forEach(arg => arg.accept(visitor))
    visitor.visitNew(this.moduleId, this.className)
  }
}
