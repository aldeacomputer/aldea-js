import {TxVisitor} from "../tx-visitor.js";
import {Argument} from "./argument.js";

export class StringArg extends Argument {
  value: string;

  constructor(value: any) {
    super()
    this.value = value
  }

  accept(visitor: TxVisitor): void {
    visitor.visitStringArg(this.value)
  }
}
