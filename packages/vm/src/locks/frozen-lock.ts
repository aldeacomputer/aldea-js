import {CoreLock, Lock} from "./lock.js";
import {LockType} from "../wasm-container.js";

export class FrozenLock implements Lock {
  coreLock (): CoreLock {
    return new CoreLock(Number(LockType.FROZEN), new Uint8Array(0));
  }
}
