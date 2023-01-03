import {FieldKind, FieldNode} from "@aldea/compiler/abi";

export interface AbiVisitor {
  visitSmallNumber(field: FieldNode): void;
}
