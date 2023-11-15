import {Abi, AbiQuery, FieldNode, FunctionNode, InterfaceNode} from "@aldea/core/abi";

export class AbiInterface {
  private abi: Abi;
  idx: any;
  name: string;
  node: InterfaceNode;

  constructor (abi: Abi, idx: number) {
    this.abi = abi
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

  get methods (): FunctionNode[] {
    return this.node.methods
  }
}
