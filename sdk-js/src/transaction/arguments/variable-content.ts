import {Argument} from "./argument.js";
import {TxVisitor} from "../tx-visitor.js";

export class VariableContent implements Argument {
  private varName: string;

  constructor(varName: string) {
    this.varName = varName
  }

  accept(visitor: TxVisitor): void {
    visitor.visitVariableContent(this.varName)
  }
}
