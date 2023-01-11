import {Abi, CodeKind, findClass, ImportNode, findImport, TypeNode, findObject} from "@aldea/compiler/abi";
import {AbiVisitor} from "./abi-visitor.js";

export class AbiTraveler {
  abi: Abi
  constructor(abi: Abi) {
    this.abi = abi
  }

  acceptForType (typeNode: TypeNode, visitor: AbiVisitor) {
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
        visitor.visitSmallNumberValue(typeName)
        return
      case 'u64':
        visitor.visitUBigNumberValue()
        return
      case 'i64':
        visitor.visitIBigNumberValue()
        return
      case 'bool':
        visitor.visitBoolean()
        return
      case 'string':
        visitor.visitString()
        return
      case 'Array':
        visitor.visitArray(typeNode.args[0], this)
        return
      case 'StaticArray':
        visitor.visitStaticArray(typeNode.args[0], this)
        return
      case 'ArrayBuffer':
        visitor.visitArrayBuffer()
        return;
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
        visitor.visitTypedArray(typeName, this)
        return
      case 'Set':
        visitor.visitSet(typeNode.args[0], this)
        return
      case 'Map':
        visitor.visitMap(typeNode.args[0], typeNode.args[1], this)
        return
      default:
        const exportClassNode = findClass(this.abi, typeName)
        const importClassNode = findImport(this.abi, typeName)
        const plainObjectNode = findObject(this.abi, typeName)

        if (exportClassNode) {
          this.acceptForClass(exportClassNode.name, visitor)
        } else
        if (importClassNode && importClassNode.kind === CodeKind.CLASS) {
          const abiNode = importClassNode as ImportNode
          visitor.visitImportedClass(typeNode, abiNode.origin)
        } else
        if (plainObjectNode) {
          visitor.visitPlainObject(plainObjectNode, typeNode, this)
        } else {
          throw new Error(`unknown type: ${typeName}`)
        }

    }
  }

  private acceptForClass(className: string, visitor: AbiVisitor) {
    const classNode = findClass(this.abi, className, `${className} does not exist in current abi.`)
    visitor.visitExportedClass(classNode, this)
  }
}
