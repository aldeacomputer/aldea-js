import {CoreLock, Lock} from "./lock.js";
import {LockType} from "@aldea/core";

export class PublicLock implements Lock {
  coreLock (): CoreLock {
    return new CoreLock(LockType.PUBLIC, new Uint8Array(0));
  }
}
