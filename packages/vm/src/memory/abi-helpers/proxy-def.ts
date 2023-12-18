import {AbiField} from "./abi-plain-object.js";
import {basicJigAbiNode} from "../../well-known-abi-nodes.js";

export class ProxyDef {
  private _name: string;
  constructor (name: string) {
    this._name = name
  }

  get name(): string {
    return this._name
  }

  get fields (): AbiField[] {
    return basicJigAbiNode
      .fields
      .map((fieldNode, i) => new AbiField(fieldNode, i * 4))
  }

  ownSize () {
    return 8;
  }
}
