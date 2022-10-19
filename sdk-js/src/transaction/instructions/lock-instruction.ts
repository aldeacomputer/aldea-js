import {Instruction} from "./instruction.js";
import {PubKey} from "../../pubkey.js";
import {TxVisitor} from "../tx-visitor.js";

export class LockInstruction implements Instruction {
  private masterListIndex: number;
  private pubkey: PubKey;

  constructor (masterListIndex: number, pubkey: PubKey) {
    this.masterListIndex = masterListIndex
    this.pubkey = pubkey
  }

  accept(visitor: TxVisitor): void {
    visitor.visitLockInstruction(this.masterListIndex, this.pubkey)
  }
}
