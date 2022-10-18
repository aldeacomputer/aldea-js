import {Argument} from "./argument.js";
import {TxExecution} from "../tx-execution.js";

export class LiteralArg implements Argument{
  literal: any

  constructor (literal: any) {
    this.literal = literal
  }

  get (context: TxExecution): any {
    return this.literal
  }

  encode (): string {
    const serialized = typeof this.literal === "number"
      ? this.literal.toString()
      : `"${this.literal}"`
    return serialized
  }
}
