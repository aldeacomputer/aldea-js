import {Abi, AbiQuery, ArgNode, MethodNode, TypeNode} from "@aldea/core/abi";
import {Option} from "../../support/option.js";
import {emptyTn} from "../well-known-abi-nodes.js";

export class AbiMethod {
  private readonly abi: Abi;
  idx: number;
  node: MethodNode;
  private readonly _className;

  constructor (abi: Abi, classIdx: number, methodIdx: number) {
    this.abi = abi;
    this.idx = methodIdx
    const query = new AbiQuery(this.abi)
    const classNode = query.fromExports().byIndex(classIdx).getClass()
    this.node = classNode.methods[methodIdx]
    this._className = classNode.name
  }

  get name (): string {
    return this.node.name
  }

  get args (): ArgNode[] {
    return this.node.args
  }

  get rtype (): TypeNode {
    return Option.fromNullable(this.node.rtype).orElse(() => emptyTn(this.className))
  }

  get className (): string {
    return this._className
  }
}
