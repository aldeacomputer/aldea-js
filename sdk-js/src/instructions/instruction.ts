import {TxVisitor} from "./tx-visitor.js";

export interface Instruction {
    accept(visitor: TxVisitor): void;
}
