import {LockType} from "../wasm-instance.js";
import {Lock} from './lock.js'
import {Address, Lock as SdkLock, Pointer} from '@aldea/sdk-js'
import {UserLock} from "./user-lock.js";
import {JigLock} from "./jig-lock.js";
import {PublicLock} from "./public-lock.js";
import {FrozenLock} from "./frozen-lock.js";
import {Option} from "../support/option.js";

export class SerializedLock {
  type: LockType
  data: Uint8Array

  constructor(type: LockType, data: Uint8Array) {
    this.type = type
    this.data = data
  }

  static fromSdkLock (lock: SdkLock) {
    return new this(
      Number(lock.type),
      lock.data
    )
  }

  hydrate (): Lock {
    if (this.type === LockType.PUBKEY) {
      return new UserLock(new Address(this.data))
    } else if (this.type === LockType.CALLER) {
      return new JigLock(Pointer.fromBytes(this.data))
    } else if (this.type === LockType.ANYONE) {
      return new PublicLock()
    } else if (this.type === LockType.FROZEN) {
      return new FrozenLock()
    } else {
      throw new Error(`unknown lock type: ${this.type}`)
    }
  }

  address(): Option<Address> {
    if (this.type !== LockType.PUBKEY) {
      return Option.none()
    } else {
      return Option.some(new Address(this.data))
    }
  }
}
