import {ClassNode, FieldKind, FieldNode, findMethod, MethodNode, TypeNode} from "@aldea/compiler/abi";
import {JIG_TOP_CLASS_NAME, lockTypeNode, outputTypeNode} from "./well-known-abi-nodes.js";
import {AbiAccess} from "./abi-access.js";
import {MethodNodeWrapper} from "./method-node-wrapper.js";

export class ClassNodeWrapper {
  private node: ClassNode;
  private abi: AbiAccess
  constructor(node: ClassNode, abi: AbiAccess) {
    this.node = node
    this.abi = abi
  }

  get name(): string {
    return this.node.name
  }

  get extends() : string {
    return this.node.extends
  }

  get fields() : FieldNode[] {
    return [
      {
        kind: FieldKind.PUBLIC,
        name: '$output',
        type: outputTypeNode
      },
      {
        kind: FieldKind.PUBLIC,
        name: '$lock',
        type: lockTypeNode
      },
      ...this.allNativeFields()
    ]
  }

  nativeFields (): FieldNode[] {
    return this.fields.slice(2)
  }

  allNativeFields (): FieldNode[] {
    let current: ClassNodeWrapper = this
    const fields: FieldNode[][] = []
    while (current.extends !== JIG_TOP_CLASS_NAME) {
      fields.push(current.node.fields)
      current = this.abi.classByName(current.extends) as ClassNodeWrapper
    }
    fields.push(current.node.fields)
    return fields.reverse().flat()
  }

  get methods() : MethodNode[] {
    return this.node.methods
  }

  get implements(): TypeNode[] {
    return this.node.implements
  }

  methodByName (name: string): MethodNodeWrapper {
    const methodOrNull = findMethod(this.node, name)
    if (!methodOrNull && this.extends === JIG_TOP_CLASS_NAME) {
      throw new Error(`unknown method ${name} for class ${this.name}`)
    }
    if (!methodOrNull) {
      const parent = this.abi.classByName(this.extends)
      return parent.methodByName(name)
    }
    return new MethodNodeWrapper(this, methodOrNull)
  }

  fieldByName(fieldName: string) {
    const fieldNode = this.fields.find(f => f.name === fieldName)
    if (!fieldNode) {
      throw new Error(`${fieldNode} was not found`)
    }
    return fieldNode
  }
}
