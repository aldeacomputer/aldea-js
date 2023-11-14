import {Lock as CoreLock, LockType, Pointer} from "@aldea/core";
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {PermissionError} from "../errors.js";

export class JigLock extends Lock {
  private origin: Pointer;

  constructor (origin: Pointer) {
    super()
    this.origin = origin
  }

  coreLock (): CoreLock {
    return new CoreLock(LockType.JIG, this.origin.toBytes());
  }

  assertOpen (exec: TxExecution): void {
    const caller = exec.stackFromTop(1) // Get Caller Origin
    caller.map(caller => {
      if (!caller.equals(this.origin)) {
        throw new PermissionError(`[line=${exec.execLength()}] ${caller.toString()} has no permission to exec over jig locked to ${this.origin.toString()}`)
      }
    }).orElse(() => {
      throw new PermissionError(`[line=${exec.execLength()}] no permission to unlock jig.`)
    })
  }
}
