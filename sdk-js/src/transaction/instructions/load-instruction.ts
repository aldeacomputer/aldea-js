import {Instruction} from "./instruction.js";
import {TxVisitor} from "../tx-visitor.js";
import {Location} from "../location.js";

export class LoadInstruction implements Instruction {
  private varName: string;
  private location: Location;
  private readonly: boolean
  private forceLocation: boolean;

  constructor(varName: string, location: Location, readOnly: boolean = true, forceLocation: boolean = false) {
    this.varName = varName
    this.location = location
    this.readonly = readOnly
    this.forceLocation = forceLocation
  }

  accept(visitor: TxVisitor): void {
    visitor.visitLoad(this.varName, this.location, this.readonly, this.forceLocation)
  }
}
