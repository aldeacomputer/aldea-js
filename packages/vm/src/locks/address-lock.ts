import {Address, LockType} from '@aldea/core';
import {CoreLock, Lock} from './lock.js'
import {TxExecution} from "../tx-execution.js";
import {NotImplementedError, PermissionError} from "../errors.js";

export class AddressLock extends Lock {
  private addr: Address;

  constructor (addr: Address) {
    super()
    this.addr = addr
  }

  coreLock (): CoreLock {
    return new CoreLock(LockType.ADDRESS, this.addr.hash);
  }

  assertOpen (exec: TxExecution): void {
    if (!exec.signedBy(this.addr)) {
      throw new PermissionError(`[line=${exec.instrucCtr}] Missing signature for ${this.addr.toString()}`)
    }
  }
}
