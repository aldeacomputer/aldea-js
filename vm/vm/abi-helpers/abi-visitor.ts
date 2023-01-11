import {ClassNode, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {AbiTraveler} from "./abi-traveler.js";

export interface AbiVisitor {
  visitExportedClass(node: ClassNode, traveler: AbiTraveler): void;
  visitImportedClass(node: TypeNode, pkgId: string): void;

  visitSmallNumberValue(typeName: string): void;
  visitIBigNumberValue(): void;
  visitBoolean(): void;
  visitString(): void;

  visitArray(innerType: TypeNode, traveler: AbiTraveler): void;
  visitStaticArray(innerType: TypeNode, traveler: AbiTraveler): void;
  visitSet(innerType: TypeNode, traveler: AbiTraveler): void;
  visitMap(keyType: TypeNode, valueType: TypeNode, traveler: AbiTraveler): void;

  visitPlainObject(plainObjectNode: ObjectNode, typeNode: TypeNode, traveler: AbiTraveler): void;

  visitTypedArray(typeName: string, param2: AbiTraveler): void;
  visitArrayBuffer(): void;

  visitUBigNumberValue(): void;
}
