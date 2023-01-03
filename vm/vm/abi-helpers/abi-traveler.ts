import {Abi, CodeKind, FieldNode, findClass} from "@aldea/compiler/abi";
import {AbiVisitor} from "./abi-visitor.js";

export class AbiTraveler {
  abi: Abi
  constructor(abi: Abi) {
    this.abi = abi
  }

  visitClass(className: string, visitor: AbiVisitor) {
    const classNode = findClass(this.abi, className, `${className} does not exist in current abi.`)
    classNode.fields.forEach((fieldNode: FieldNode) => {
      const type = fieldNode.type
      switch (type.name) {
        case 'u8':
        case 'i8':
        case 'u16':
        case 'i16':
        case 'u32':
        case 'i32':
        case 'f32':
        case 'f64':
          visitor.visitSmallNumber(fieldNode)
          return
        default:
          throw new Error('unknown type')
      }
    })
  }
}
