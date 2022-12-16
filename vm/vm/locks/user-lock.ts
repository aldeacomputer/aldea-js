import { Lock } from './lock.js'
import {TxExecution} from "../tx-execution.js";
import {Address} from '@aldea/sdk-js';
import {LockType} from "../wasm-instance.js";

export class UserLock implements Lock {
  private addr: Address;
  private _isOpen: boolean;

  constructor (pubkey: Address) {
    this.addr = pubkey
    this._isOpen = false
  }

  open (): void {
    this._isOpen = true
  }

  isOpen () {
    return this._isOpen
  }

  serialize (): any {
    return {
      type: this.typeNumber(),
      data: this.addr.hash
    }
  }

  acceptsExecution(context: TxExecution): boolean {
    this._isOpen = true;
    return context.tx.isSignedBy(this.addr, context.execLength());
  }

  canBeChangedBy(context: TxExecution): boolean {
    return this.acceptsExecution(context);
  }

  typeNumber(): number {
    return LockType.PUBKEY;
  }
}
