import {
  Abi,
  CodeKind,
  findClass,
  ImportNode,
  findImport,
  TypeNode,
  findObject,
  ObjectNode,
  ClassNode
} from "@aldea/compiler/abi";
import {AbiTraveler} from "./abi-traveler.js";

export class AbiTraveler2 {
  abi: Abi
  constructor(abi: Abi) {
    this.abi = abi
  }

  acceptForType<T> (typeNode: TypeNode, visitor: AbiTraveler<T>): T {
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
        return visitor.visitSmallNumberValue(typeName)
      case 'u64':
        return visitor.visitUBigNumberValue()
      case 'i64':
        return visitor.visitIBigNumberValue()
      case 'bool':
        return visitor.visitBoolean()
      case 'string':
        return visitor.visitString()
      case 'Array':
        return visitor.visitArray(typeNode.args[0], this)
      case 'StaticArray':
        return visitor.visitStaticArray(typeNode.args[0], this)
      case 'ArrayBuffer':
        return visitor.visitArrayBuffer()
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
        return visitor.visitTypedArray(typeName, this)
      case 'Set':
        return visitor.visitSet(typeNode.args[0], this)
      case 'Map':
        return visitor.visitMap(typeNode.args[0], typeNode.args[1], this)
      case 'void':
        return visitor.visitVoid()
      default:
        const exportClassNode = findClass(this.abi, typeName)
        const importClassNode = findImport(this.abi, typeName)
        const plainObjectNode = findObject(this.abi, typeName)

        if (exportClassNode) {
          return this.acceptForClass(exportClassNode, typeNode, visitor)
        } else
        if (importClassNode && importClassNode.kind === CodeKind.CLASS) {
          const abiNode = importClassNode as ImportNode
          return visitor.visitImportedClass(typeNode, abiNode.origin)
        } else
        if (plainObjectNode) {
          return this.acceptForPlainObject<T>(plainObjectNode, typeNode, visitor)
        } else {
          break
        }
    }
    throw new Error(`unknown type: ${typeName}`)
  }

  private acceptForClass<T>(classNode: ClassNode, type: TypeNode, visitor: AbiTraveler<T>): T {
    return visitor.visitExportedClass(classNode, type, this)
  }

  private acceptForPlainObject<T>(objNode: ObjectNode, type: TypeNode, visitor: AbiTraveler<T>): T {
    return visitor.visitPlainObject(objNode, type, this)

  }
}
