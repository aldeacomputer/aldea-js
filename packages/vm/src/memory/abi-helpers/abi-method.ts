import {Abi, AbiQuery, ArgNode, MethodNode, TypeNode} from "@aldea/core/abi";
import {Option} from "../../support/option.js";
import {emptyTn} from "../well-known-abi-nodes.js";
import {AbiType} from "./abi-type.js";


export class AbiArg {
  node: ArgNode

  constructor (node: ArgNode) {
    this.node = node
  }

  get name (): string {
    return this.node.name
  }

  get type (): AbiType {
    return new AbiType(this.node.type)
  }
}

export class AbiMethod {
  idx: number;
  node: MethodNode;
  private readonly _className;

  constructor (idx: number, className: string, methodNode: MethodNode) {
    this.idx = idx
    this.node = methodNode
    this._className = className
  }

  get name (): string {
    return this.node.name
  }

  get args (): AbiArg[] {
    return this.node.args.map((arg) => new AbiArg(arg))
  }

  get rtype (): AbiType {
    return Option.fromNullable(this.node.rtype)
        .or(Option.some(emptyTn(this._className)))
        .map(node => new AbiType(node))
        .get()
  }

  callName (): string {
    return `__${this._className}_${this.name}`;
  }
}
