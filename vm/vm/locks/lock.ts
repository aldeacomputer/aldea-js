import {TxExecution} from "../tx-execution.js";

export interface Lock {
  serialize (): string
  isOpen (): boolean

  acceptsExecution(context: TxExecution): boolean;
}
