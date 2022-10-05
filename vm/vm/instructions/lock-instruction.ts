import { UserLock } from "../locks/user-lock.js"
import {TxExecution} from "../tx-execution.js";

export class LockInstruction {
  private masterListIndex: number;
  private pubkey: Uint8Array;

  constructor (masterListIndex: number, pubkey: Uint8Array) {
    this.masterListIndex = masterListIndex
    this.pubkey = pubkey
  }

  exec (context: TxExecution) {
    context.lockJig(this.masterListIndex, new UserLock(this.pubkey))
  }

  encode () {
    return `LOCK $${this.masterListIndex} "${this.pubkey}"`
  }

  getPubKey (): Uint8Array {
    return this.pubkey
  }
}
