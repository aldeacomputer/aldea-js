import {Abi, AbiQuery, ClassNode, CodeKind, FieldNode, MethodNode} from "@aldea/core/abi";
import {lockTypeNode, outputTypeNode} from "../well-known-abi-nodes.js";
import {Option} from "../../support/option.js";

export class AbiClass {
  private abi: Abi;
  idx: number;
  private node: ClassNode;

  constructor (abi: Abi, idx: number) {
    this.abi = abi
    this.idx = idx
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    this.node = query.getClass()
  }

  get name (): string {
    return this.node.name
  }

  get extends (): string {
    return this.node.extends
  }

  get fields (): FieldNode[] {
    return [
      {
        name: '$output',
        type: outputTypeNode
      },
      {
        name: '$lock',
        type: lockTypeNode
      },
      ...this.allNativeFields()
    ]
  }

  allNativeFields (): FieldNode[] {
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    const parents = query.getClassParents()
    return parents.map(p => p.fields).flat()
  }

  nativeFields (): FieldNode[] {
    return this.node.fields
  }

  get methods (): MethodNode[] {
    return this.node.methods
  }

  get implements (): string[] {
    return this.node.implements
  }


  get kind (): CodeKind.CLASS {
    return this.node.kind
  }

  methodByName (name: string): Option<MethodNode> {
    const method = this.node.methods.find(m => m.name == name)
    return Option.fromNullable(method)
  }

  methodByIdx (methodIdx: number): Option<MethodNode> {
    return Option.fromNullable(this.methods[methodIdx])
  }

  isSubclassByIndex(parentIdx: number): boolean {
    const query = new AbiQuery(this.abi)
    const parentNode = query.fromExports().byIndex(parentIdx).byIndex(parentIdx).getClass()
    query.reset()
    const hierarchy = query.fromExports().byIndex(this.idx).getClassParents()
    return hierarchy.some(ancestor => ancestor.name === parentNode.name)
  }
}
