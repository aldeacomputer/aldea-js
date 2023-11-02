import {Abi, AbiQuery, ArgNode, FunctionNode, TypeNode} from "@aldea/core/abi";

export class AbiFunction {
  private abi: Abi;
  private idx: number;
  private node: FunctionNode;

  constructor (abi: Abi, idx: number) {
    this.abi = abi
    this.idx = idx
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    this.node = query.getFunction()
  }

  name (): string {
    return this.node.name
  }

  args (): ArgNode[] {
    return this.node.args
  }

  rtype (): TypeNode {
    return this.node.rtype
  }
}
