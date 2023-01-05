import {ClassNode, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {AbiTraveler} from "./abi-traveler.js";

export interface AbiVisitor {
  visitExportedClass(node: ClassNode, traveler: AbiTraveler): void;
  visitImportedClass(name: any, origin: any): void;

  visitSmallNumberValue(typeName: string): void;
  visitBigNumberValue(typeName: string): void;
  visitBoolean(): void;
  visitString(): void;

  visitArray(innerType: TypeNode): void;
  visitSet(innerType: TypeNode): void;
  visitMap(keyType: TypeNode, valueType: TypeNode): void;

  visitPlainObject(plainObjectNode: ObjectNode, typeNode: TypeNode, traveler: AbiTraveler): void;
}
