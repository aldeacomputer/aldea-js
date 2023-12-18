import {MethodNode} from "@aldea/core/abi";
import {Option} from "../../support/option.js";
import {emptyTn} from "../../well-known-abi-nodes.js";
import {AbiType} from "./abi-type.js";
import {AbiArg} from "./abi-arg.js";

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
