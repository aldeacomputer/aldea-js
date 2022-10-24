import {Instruction} from "../instructions/instruction.js";
import {TxVisitor} from "../tx-visitor.js";

export abstract class Argument implements Instruction {
  abstract accept(visitor: TxVisitor): void;
}
