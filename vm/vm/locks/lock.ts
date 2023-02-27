import {TxExecution} from "../tx-execution.js";
import {Address, Pointer} from "@aldea/sdk-js";
import {Option} from "../support/option.js";

export interface Lock {
  data(): Uint8Array;
  serialize (): any;
  isOpen (): boolean

  acceptsExecution(context: TxExecution): boolean;

  canBeChangedBy(context: TxExecution): boolean;

  typeNumber(): number;

  acceptsChangeFrom(callerOrigin: Pointer, context: TxExecution): boolean;

  address(): Option<Address>;
}
