export class UserLock {
  constructor (pubkey) {
    this.pubkey = pubkey
  }

  open (key) {
    if (key !== this.pubkey) {
      throw new PermissionError('wrong key')
    }
    return null
  }
}
