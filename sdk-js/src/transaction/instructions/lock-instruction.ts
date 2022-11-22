import {Instruction} from "./instruction.js";
import {TxVisitor} from "../tx-visitor.js";
import {Address} from "../../address.js";

export class LockInstruction implements Instruction {
  private varName: string;
  private addr: Address;

  constructor (varName: string, pubkey: Address) {
    this.varName = varName
    this.addr = pubkey
  }

  accept(visitor: TxVisitor): void {
    visitor.visitLockInstruction(this.varName, this.addr)
  }
}
