import { PermissionError } from '../errors.js'
import { Lock } from './lock.js'

export class UserLock implements Lock {
  private pubkey: Uint8Array;
  private _isOpen: boolean;

  constructor (pubkey: Uint8Array) {
    this.pubkey = pubkey
    this._isOpen = false
  }

  open (key: Uint8Array): void {
    if (key !== this.pubkey) {
      throw new PermissionError('wrong key')
    }
    this._isOpen = true
  }

  checkCaller (caller: string) {
    return this._isOpen
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
}
