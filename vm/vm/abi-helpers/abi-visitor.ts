import {ClassNode, FieldKind, FieldNode} from "@aldea/compiler/abi";
import {AbiTraveler} from "./abi-traveler.js";

export interface AbiVisitor {
  // visitSmallNumberField(field: FieldNode): void;
  visitExportedClass(node: ClassNode, traveler: AbiTraveler): void;

  visitSmallNumberValue(typeName: string): void;
  visitBigNumberValue(typeName: string): void;
  visitBoolean(): void;
  visitString(): void;
}
