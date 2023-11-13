import {Address, LockType} from '@aldea/core';
import {CoreLock, Lock} from './lock.js'

export class AddressLock implements Lock {
  private addr: Address;

  constructor (pubkey: Address) {
    this.addr = pubkey
  }

  coreLock (): CoreLock {
    return new CoreLock(LockType.ADDRESS, this.addr.hash);
  }

}
