import {TxVisitor} from "../instructions/tx-visitor.js";
import {Argument} from "./argument.js";

export class JigArg extends Argument {
  masterListIndex: number;

  constructor(index: number) {
    super()
    this.masterListIndex = index
  }

  accept(visitor: TxVisitor): void {
    visitor.visitJigArg(this.masterListIndex)
  }
}
