import {ClassNode, FieldKind, FieldNode, MethodNode} from "@aldea/compiler/abi";
import {lockTypeNode, outputTypeNode} from "./well-known-abi-nodes.js";

export class ClassNodeWrapper {
  private node: ClassNode;
  constructor(node: ClassNode) {
    this.node = node
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
      ...this.node.fields
    ]
  }

  nativeFields (): FieldNode[] {
    return this.node.fields
  }

  get methods() : MethodNode[] {
    return this.node.methods
  }
}
