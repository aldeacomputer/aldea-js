import {Abi, AbiQuery, FieldNode, MethodNode, InterfaceNode} from "@aldea/core/abi";

export class AbiInterface {
  idx: any;
  name: string;
  node: InterfaceNode;

  constructor (abi: Abi, idx: number) {
    this.idx = idx
    const code = new AbiQuery(abi)
      .fromExports()
      .byIndex(this.idx)
      .getInterface()
    this.name = code.name
    this.node = code
  }

  // extends: string[];
  // fields: FieldNode[];
  // methods: FunctionNode[];

  get extends (): string[] {
    return this.node.extends
  }

  get fields (): FieldNode[] {
    return this.node.fields
  }

  get methods (): MethodNode[] {
    return this.node.methods
  }
}
