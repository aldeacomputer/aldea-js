import {Lock as CoreLock, LockType, Pointer} from "@aldea/core";
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {NotImplementedError} from "../errors.js";

export class JigLock extends Lock {
  private origin: Pointer;

  constructor (origin: Pointer) {
    super()
    this.origin = origin
  }

  coreLock (): CoreLock {
    return new CoreLock(LockType.JIG, this.origin.toBytes());
  }

  assertOpen (_param: TxExecution): void {
    throw new NotImplementedError()
  }
}
