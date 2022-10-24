import {Instruction} from "./instruction.js";
import {PubKey} from "../../pubkey.js";
import {TxVisitor} from "../tx-visitor.js";

export class LockInstruction implements Instruction {
  private varName: string;
  private pubkey: PubKey;

  constructor (varName: string, pubkey: PubKey) {
    this.varName = varName
    this.pubkey = pubkey
  }

  accept(visitor: TxVisitor): void {
    visitor.visitLockInstruction(this.varName, this.pubkey)
  }
}
