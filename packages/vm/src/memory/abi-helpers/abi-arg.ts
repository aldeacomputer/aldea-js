import {ArgNode} from "@aldea/core/abi";
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
