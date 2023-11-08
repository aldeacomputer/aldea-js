import {ClassNode, FieldNode, TypeNode,} from "@aldea/core/abi";
import {AbiAccess} from "./abi-access.js";
import {AbiInterface} from "./abi-helpers/abi-interface.js";
import {AbiClass} from "./abi-helpers/abi-class.js";

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

  abstract visitExportedClass(classNode: AbiClass, type: TypeNode): T;
  abstract visitPlainObject(objNode: FieldNode[], type: TypeNode): T;

  abstract visitInterface(anInterface: AbiInterface, typeNode: TypeNode): T;

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
        const maybeExportedClass= this.abi.exportedByName(typeName).map(e => e.toAbiClass());
        if (maybeExportedClass.isPresent()) {
          const exportClassNode = maybeExportedClass.get()
          return this.visitExportedClass(exportClassNode, typeNode)
        }
        const maybeImportedClass = this.abi.importedByName(typeName).map(i => i.toImportedClass())
        if (maybeImportedClass.isPresent()) {
          const importClassNode = maybeImportedClass.get()
          return this.visitImportedClass(typeNode, importClassNode.pkgId)
        }
        const maybeExportedObject = this.abi.exportedByName(typeName).map(e => e.toAbiObject())
        if (maybeExportedObject.isPresent()) {
          const plainObjectNode = maybeExportedObject.get()
          return this.visitPlainObject(plainObjectNode.fields, typeNode)
        }
        const maybeExportedInterface = this.abi.exportedByName(typeName).map(e => e.toAbiInterface())
        if (maybeExportedInterface.isPresent()) {
          const anInterface = maybeExportedInterface.get()
          return this.visitInterface(anInterface, typeNode)
        }
        const maybeImportedInterface = this.abi.importedByName(typeName).map(e => e.toImportedInterface())
        if (maybeImportedInterface.get()) {
          return this.visitInterface({} as any, typeNode)
        }
    }
    throw new Error(`unknown type: ${typeName}`)
  }
}
