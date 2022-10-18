import { Lock } from './lock.js'
import {TxExecution} from "../tx-execution.js";
import {PubKey} from '@aldea/sdk-js';

export class UserLock implements Lock {
  private pubkey: PubKey;
  private _isOpen: boolean;

  constructor (pubkey: PubKey) {
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
