import {TxExecution} from "../tx-execution.js";

export interface Lock {
  data(): Uint8Array;
  serialize (): any;
  isOpen (): boolean

  acceptsExecution(context: TxExecution): boolean;

  canBeChangedBy(context: TxExecution): boolean;

  typeNumber(): number;
}
