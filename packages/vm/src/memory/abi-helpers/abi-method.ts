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

  get args (): AbiArg[] {
    return this.node.args.map((arg) => new AbiArg(arg))
  }

  get rtype (): AbiType {
    return Option.fromNullable(this.node.rtype)
        .or(Option.some(emptyTn(this.className)))
        .map(node => new AbiType(node))
        .get()
  }

  get className (): string {
    return this._className
  }

  callName (): string {
    return `__${this._className}_${this.name}`;
  }

  bcsName (): string {
    return `${this.className}_${this.name}`;
  }
}
