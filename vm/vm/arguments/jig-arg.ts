import {TxExecution} from "../tx-execution.js";

export class JigArg {
  index: number

  constructor (masterListIndex: number) {
    this.index = masterListIndex
  }

  get (context: TxExecution): any {
    const jig = context.getJigRef(this.index)
    return jig.origin
  }

  encode (): string {
    return `$${this.index}`
  }
}
