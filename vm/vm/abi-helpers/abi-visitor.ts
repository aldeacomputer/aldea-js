import {ClassNode, FieldNode, ObjectNode, TypeNode} from "@aldea/compiler/abi";
import {AbiTraveler} from "./abi-traveler.js";

export interface AbiVisitor<T> {
  visitImportedClass(node: TypeNode, pkgId: string): T;

  visitSmallNumberValue(typeName: string): T;
  visitIBigNumberValue(): T;
  visitBoolean(): T;
  visitString(): T;

  visitArray(innerType: TypeNode, traveler: AbiTraveler): T;
  visitStaticArray(innerType: TypeNode, traveler: AbiTraveler): T;
  visitSet(innerType: TypeNode, traveler: AbiTraveler): T;
  visitMap(keyType: TypeNode, valueType: TypeNode, traveler: AbiTraveler): T;

  visitTypedArray(typeName: string, param2: AbiTraveler): T;
  visitArrayBuffer(): T;

  visitUBigNumberValue(): T;

  visitVoid(): T;

  visitExportedClass(classNode: ClassNode, type: TypeNode, traveler: AbiTraveler): T;
  visitPlainObject(objNode: ObjectNode, type: TypeNode, traveler: AbiTraveler): T;
}
