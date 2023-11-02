import {Abi, AbiQuery, CodeKind, FieldNode, ObjectNode} from "@aldea/core/abi";

export class AbiPlainObject {
  private abi: Abi;
  idx: number;
  private node: ObjectNode;

  constructor (abi: Abi, idx: number, node: ObjectNode) {
    this.abi = abi
    this.idx = idx
    this.node = node
  }

  get kind (): CodeKind {
    return this.node.kind
  }

  get name (): string {
    return this.node.name
  }

  get fields (): FieldNode[] {
    return this.node.fields
  }
}
