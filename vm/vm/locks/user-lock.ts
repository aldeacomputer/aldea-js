import { Lock } from './lock.js'
import {TxExecution} from "../tx-execution.js";
import {Address, Pointer} from '@aldea/sdk-js';
import {LockType} from "../wasm-instance.js";
import {Option} from "../support/option.js";

export class UserLock implements Lock {
  private addr: Address;

  constructor (pubkey: Address) {
    this.addr = pubkey
  }

  isOpen (): boolean {
    return false
  }

  serialize (): any {
    return {
      type: this.typeNumber(),
      data: this.addr.hash
    }
  }

  acceptsExecution(context: TxExecution): boolean {
    return context.tx.tx.isSignedBy(this.addr, context.execLength());
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
