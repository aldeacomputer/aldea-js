import { Lock } from './lock.js'
import {TxExecution} from "../tx-execution.js";

export class UserLock implements Lock {
  private pubkey: Uint8Array;
  private _isOpen: boolean;

  constructor (pubkey: Uint8Array) {
    this.pubkey = pubkey
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
      type: 'UserLock',
      data: { pubkey: this.pubkey }
    }
  }

  acceptsExecution(context: TxExecution): boolean {
    return context.tx.isSignedBy(this.pubkey);
  }
}
