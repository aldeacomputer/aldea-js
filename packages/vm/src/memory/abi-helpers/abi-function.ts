import {Abi, AbiQuery, ArgNode, FunctionNode, TypeNode} from "@aldea/core/abi";
import {AbiType} from "./abi-type.js";
import {AbiArg} from "./abi-arg.js";

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

  get name (): string {
    return this.node.name
  }

  get args (): AbiArg[] {
    return this.node.args.map((arg) => new AbiArg(arg))
  }

  get rtype (): AbiType {
    return new AbiType(this.node.rtype)
  }
}
