import {Abi, CodeKind, FieldNode, findClass} from "@aldea/compiler/abi";
import {AbiVisitor} from "./abi-visitor.js";

export class AbiTraveler {
  abi: Abi
  constructor(abi: Abi) {
    this.abi = abi
  }

  visitValue (typeName: string, visitor: AbiVisitor) {
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
      case 'i64':
        visitor.visitBigNumberValue(typeName)
        return
      case 'bool':
        visitor.visitBoolean()
        return
      case 'string':
        visitor.visitString()
        return
      default:
        const classNode = findClass(this.abi, typeName)
        if (!classNode) {
          throw new Error(`unknown type: ${typeName}`)
        }
        this.visitClass(classNode.name, visitor)
    }
  }

  private visitClass(className: string, visitor: AbiVisitor) {
    const classNode = findClass(this.abi, className, `${className} does not exist in current abi.`)
    visitor.visitExportedClass(classNode, this)
    // classNode.fields.forEach((fieldNode: FieldNode) => {
    //   const type = fieldNode.type
    //   switch (type.name) {
    //     case 'u8':
    //     case 'i8':
    //     case 'u16':
    //     case 'i16':
    //     case 'u32':
    //     case 'i32':
    //     case 'f32':
    //     case 'f64':
    //       visitor.visitSmallNumberField(fieldNode)
    //       return
    //     default:
    //       throw new Error('unknown type')
    //   }
    // })
  }
}
