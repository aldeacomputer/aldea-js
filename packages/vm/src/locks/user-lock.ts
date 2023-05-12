import {Address, Pointer} from '@aldea/core';
import { Lock } from './lock.js'
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Option} from "../support/option.js";
import {SerializedLock} from "./serialized-lock.js";

export class UserLock implements Lock {
  private addr: Address;

  constructor (pubkey: Address) {
    this.addr = pubkey
  }

  isOpen (): boolean {
    return false
  }

  serialize (): SerializedLock {
    return new SerializedLock(this.typeNumber(), this.data())
  }

  acceptsExecution(context: TxExecution): boolean {
    return context.signedBy(this.addr);
  }

  canBeChangedBy(context: TxExecution): boolean {
    return this.acceptsExecution(context);
  }

  typeNumber(): number {
    return LockType.PUBKEY;
  }

  data(): Uint8Array {
    return this.addr.hash
  }

  acceptsChangeFrom(_callerOrigin: Pointer, context: TxExecution): boolean {
    return this.acceptsExecution(context);
  }

  address(): Option<Address> { return Option.some(this.addr) }
}
