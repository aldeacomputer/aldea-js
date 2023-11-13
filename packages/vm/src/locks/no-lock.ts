import {CoreLock, Lock} from "./lock.js";
import {LockType} from "@aldea/core";

export class NoLock implements Lock {
  constructor () {}

  coreLock (): CoreLock {
    return new CoreLock(LockType.NONE, new Uint8Array(0));
  }
}
