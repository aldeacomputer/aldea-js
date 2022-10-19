import {TxExecution} from "../tx-execution.js";

export class JigArg {
  index: number

  constructor (masterListIndex: number) {
    this.index = masterListIndex
  }

  get (context: TxExecution): any {
    return context.getJigRef(this.index)
  }

  encode (): string {
    return `$${this.index}`
  }
}
