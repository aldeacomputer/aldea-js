import {Instruction} from "./instruction.js";
import {TxVisitor} from "../tx-visitor.js";

export class LoadInstruction implements Instruction {
  private location: string;
  private forceLocation: boolean;

  constructor (location: string, forceLocation: boolean = false) {
    this.location = location
    this.forceLocation = forceLocation
  }

  accept(visitor: TxVisitor): void {
    visitor.visitLoad(this.location, this.forceLocation)
  }
}
