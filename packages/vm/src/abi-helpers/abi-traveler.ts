import {
  ClassNode,
  ImportNode,
  InterfaceNode,
  ObjectNode,
  TypeNode,
} from "@aldea/core/abi";
import {AbiAccess} from "./abi-access.js";
import {AbiPlainObject} from "./abi-helpers/abi-plain-object.js";

export abstract class AbiTraveler<T> {
  abi: AbiAccess

  constructor(abi: AbiAccess) {
    this.abi = abi
  }

  abstract visitImportedClass(node: TypeNode, pkgId: string): T;

  abstract visitSmallNumberValue(typeName: string): T;
  abstract visitIBigNumberValue(): T;
  abstract visitBoolean(): T;
  abstract visitString(): T;

  abstract visitArray(innerType: TypeNode): T;
  abstract visitStaticArray(innerType: TypeNode): T;
  abstract visitSet(innerType: TypeNode): T;
  abstract visitMap(keyType: TypeNode, valueType: TypeNode): T;

  abstract visitTypedArray(typeName: string): T;
  abstract visitArrayBuffer(): T;

  abstract visitUBigNumberValue(): T;

  abstract visitVoid(): T;

  abstract visitExportedClass(classNode: ClassNode, type: TypeNode): T;
  abstract visitPlainObject(objNode: AbiPlainObject, type: TypeNode): T;

  abstract visitInterface(anInterface: InterfaceNode, typeNode: TypeNode): T;

  travelFromType(typeNode: TypeNode): T {
    const typeName = typeNode.name
    switch (typeName) {
      case 'u8':
      case 'i8':
      case 'u16':
      case 'i16':
      case 'u32':
      case 'i32':
      case 'usize':
      case 'isize':
      case 'f32':
      case 'f64':
        return this.visitSmallNumberValue(typeName)
      case 'u64':
        return this.visitUBigNumberValue()
      case 'i64':
        return this.visitIBigNumberValue()
      case 'bool':
        return this.visitBoolean()
      case 'string':
        return this.visitString()
      case 'Array':
        return this.visitArray(typeNode.args[0])
      case 'StaticArray':
        return this.visitStaticArray(typeNode.args[0])
      case 'ArrayBuffer':
        return this.visitArrayBuffer()
      case 'Int8Array':
      case 'Int16Array':
      case 'Int32Array':
      case 'Int64Array':
      case 'Uint8Array':
      case 'Uint16Array':
      case 'Uint32Array':
      case 'Uint64Array':
      case 'Float32Array':
      case 'Float64Array':
        return this.visitTypedArray(typeName)
      case 'Set':
        return this.visitSet(typeNode.args[0])
      case 'Map':
        return this.visitMap(typeNode.args[0], typeNode.args[1])
      case 'void':
        return this.visitVoid()
      default:
        const maybeExportedClass= this.abi.exportedByName(typeName).get().toAbiClass();
        if (maybeExportedClass.isPresent()) {
          const exportClassNode = maybeExportedClass.get()
          return this.visitExportedClass(exportClassNode, typeNode)
        }
        const maybeImportedClass = this.abi.importedClassByName()
        if (this.abi.importClassNameExists(typeName)) {
          const importClassNode = this.abi.importedByName(typeName)
          const abiNode = importClassNode as ImportNode
          return this.visitImportedClass(typeNode, abiNode.pkg)
        }
        if (this.abi.exportedObjectNameExists(typeName)) {
          const plainObjectNode = this.abi.objectByName(typeName)
          return this.visitPlainObject(plainObjectNode, typeNode)
        }
        if (this.abi.exportedInterfaceNameExists(typeName)) {
          const anInterface = this.abi.interfaceByName(typeName)
          return this.visitInterface(anInterface, typeNode)
        }
        if (this.abi.importedInterfaceExists(typeName)) {
          return this.visitInterface({} as any, typeNode)
        }
    }
    throw new Error(`unknown type: ${typeName}`)
  }
}
