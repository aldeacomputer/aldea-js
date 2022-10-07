import { UserLock } from "../locks/user-lock.js"

export class LockInstruction {
  constructor (masterListIndex, pubkey) {
    this.masterListIndex = masterListIndex
    this.pubkey = pubkey
  }

  exec (context) {
    context.lockJig(this.masterListIndex, new UserLock(this.pubkey))
  }

  encode () {
    return `LOCK $${this.masterListIndex} "${this.pubkey}"`
  }

  getPubKey () {
    return null
  }
}
