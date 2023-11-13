import {Lock as CoreLock, LockType, Pointer} from "@aldea/core";
import {Lock} from "./lock.js";

export class JigLock implements Lock {
  private origin: Pointer;

  constructor (origin: Pointer) {
    this.origin = origin
  }

  coreLock (): CoreLock {
    return new CoreLock(LockType.JIG, this.origin.toBytes());
  }
}
