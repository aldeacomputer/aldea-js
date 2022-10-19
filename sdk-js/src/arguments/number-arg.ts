import {TxVisitor} from "../instructions/tx-visitor.js";
import {Argument} from "./argument.js";

export class NumberArg extends Argument {
  value: number;

  constructor(value: any) {
    super()
    this.value = value
  }

  accept(visitor: TxVisitor): void {
    visitor.visitNumberArg(this.value)
  }
}
