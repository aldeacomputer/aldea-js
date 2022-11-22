import {TxExecution} from "../tx-execution.js";

export interface Lock {
  serialize (): any
  isOpen (): boolean

  acceptsExecution(context: TxExecution): boolean;

  canBeChangedBy(context: TxExecution): boolean;

  typeNumber(): number;
}
