import {CoreLock, Lock} from "./lock.js";
import {LockType} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";
import {NotImplementedError} from "../errors.js";

export class PublicLock extends Lock {
  coreLock (): CoreLock {
    return new CoreLock(LockType.PUBLIC, new Uint8Array(0));
  }

  assertOpen (_param: TxExecution): void {
    throw new NotImplementedError()
  }
}
