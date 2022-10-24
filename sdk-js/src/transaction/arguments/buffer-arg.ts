import {TxVisitor} from "../tx-visitor.js";
import {Argument} from "./argument.js";

export class BufferArg extends Argument {
  value: Uint8Array;

  constructor(value: any) {
    super()
    this.value = value
  }

  accept(visitor: TxVisitor): void {
    visitor.visitBufferArg(this.value)
  }
}
