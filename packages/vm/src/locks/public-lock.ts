import {CoreLock, Lock} from "./lock.js";
import {LockType} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";

export class PublicLock extends Lock {
  coreLock (): CoreLock {
    return new CoreLock(LockType.PUBLIC, new Uint8Array(0));
  }

  canReceiveCalls (_param: TxExecution): boolean {
    return true;
  }

  canBeChanged (_param: TxExecution): boolean {
    return false;
  }

  assertOpen (param: TxExecution): void {
    // no-op
  }
}
