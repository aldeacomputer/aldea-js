import { PermissionError } from "../errors.js"

export class UserLock {
  constructor (pubkey) {
    this.pubkey = pubkey
    this._isOpen = false
  }

  open (key) {
    if (key !== this.pubkey) {
      throw new PermissionError('wrong key')
    }
    this._isOpen = true
    return null
  }

  checkCaller (_caller) {
    return this._isOpen
  }

  isOpen () {
    return this._isOpen
  }

  serialize () {
    return {
      type: 'UserLock',
      data: { pubkey: this.pubkey }
    }
  }
}
