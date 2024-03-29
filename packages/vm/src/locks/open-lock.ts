import {CoreLock, Lock} from "./lock.js";
import {LockType} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";

export class OpenLock extends Lock {
  coreLock (): CoreLock {
    return new CoreLock(LockType.NONE, new Uint8Array(0));
  }

  assertOpen (_param: TxExecution): void {
    // no-op
  }

  canReceiveCalls (_param: TxExecution): boolean {
    return true;
  }

  canBeChanged (_param: TxExecution): boolean {
    return true;
  }
}
