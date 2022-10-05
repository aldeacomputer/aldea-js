import {TxExecution} from "../tx-execution.js";

export interface Argument {
  get (context: TxExecution): any
  encode (): string
}
