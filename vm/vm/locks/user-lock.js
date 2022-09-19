import { PermissionError } from "../permission-error.js"

export class UserLock {
  constructor (pubkey) {
    this.pubkey = pubkey
    this.isOpen = false
  }

  open (key) {
    if (key !== this.pubkey) {
      throw new PermissionError('wrong key')
    }
    this.isOpen = true
    return null
  }

  checkCaller (_caller) {
    return this.isOpen
  }
}
