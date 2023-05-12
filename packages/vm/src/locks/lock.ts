import {Address, Pointer} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";
import {Option} from "../support/option.js";
import {SerializedLock} from "./serialized-lock.js";

export interface Lock {
  data(): Uint8Array;
  serialize (): SerializedLock;
  isOpen (): boolean

  acceptsExecution(context: TxExecution): boolean;

  canBeChangedBy(context: TxExecution): boolean;

  typeNumber(): number;

  acceptsChangeFrom(callerOrigin: Pointer, context: TxExecution): boolean;

  address(): Option<Address>;
}
