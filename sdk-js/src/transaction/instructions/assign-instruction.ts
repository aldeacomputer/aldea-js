import {Instruction} from "./instruction.js";
import {TxVisitor} from "../tx-visitor.js";

export class AssignInstruction implements Instruction {
  private varName: string;
  private masterListIndex: number;

  constructor (varName: string, masterListIndex: number) {
    this.varName = varName
    this.masterListIndex = masterListIndex
  }

  accept(visitor: TxVisitor): void {
    visitor.acceptAssign(this.varName, this.masterListIndex)
  }
}
