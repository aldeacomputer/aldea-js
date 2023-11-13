import {CoreLock, Lock} from "./lock.js";
import {Address, LockType, Pointer} from "@aldea/core";
import {AddressLock} from "./address-lock.js";
import {JigLock} from "./jig-lock.js";
import {OpenLock} from "./open-lock.js";
import {PublicLock} from "./public-lock.js";
import {FrozenLock} from "./frozen-lock.js";

export function fromCoreLock (lock: CoreLock): Lock {
  switch (lock.type) {
    case LockType.ADDRESS:
      return new AddressLock(new Address(lock.data))
    case LockType.JIG:
      return new JigLock(Pointer.fromBytes(lock.data))
    case LockType.NONE:
      return new OpenLock()
    case LockType.PUBLIC:
      return new PublicLock()
    case LockType.FROZEN:
      return new FrozenLock()
    default:
      throw new Error(`Unknown lock type: ${lock.type}`)
  }
}
