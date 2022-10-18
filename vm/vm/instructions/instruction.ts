import {TxExecution} from "../tx-execution.js";

export interface Instruction {
  exec (context: TxExecution): void
  encode (): string
}
