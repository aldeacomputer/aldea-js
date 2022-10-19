import { UserLock } from "../locks/user-lock.js"
import {TxExecution} from "../tx-execution.js";
import {PubKey} from "@aldea/sdk-js";

export class LockInstruction {
  private masterListIndex: number;
  private pubkey: PubKey;

  constructor (masterListIndex: number, pubkey: PubKey) {
    this.masterListIndex = masterListIndex
    this.pubkey = pubkey
  }

  exec (context: TxExecution) {
    context.lockJig(this.masterListIndex, new UserLock(this.pubkey))
  }

  encode () {
    return `LOCK $${this.masterListIndex} "${this.pubkey.toHex()}"`
  }

  getPubKey (): PubKey {
    return this.pubkey
  }
}
