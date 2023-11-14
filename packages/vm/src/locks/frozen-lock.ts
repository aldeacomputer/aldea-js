import {CoreLock, Lock} from "./lock.js";
import {LockType} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";
import {NotImplementedError, PermissionError} from "../errors.js";

export class FrozenLock extends Lock {
  coreLock (): CoreLock {
    return new CoreLock(Number(LockType.FROZEN), new Uint8Array(0));
  }

  assertOpen (exec: TxExecution): void {
    throw new PermissionError(`[line=${exec.execLength()}] jig is frozen`)
  }
}
