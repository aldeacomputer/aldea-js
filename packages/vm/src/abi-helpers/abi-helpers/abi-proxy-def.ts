import {Abi, AbiQuery, assertProxy, CodeKind, ProxyNode} from "@aldea/core/abi";
import {AbiField} from "./abi-plain-object.js";
import {basicJigAbiNode} from "../well-known-abi-nodes.js";

export class AbiProxyDef {
  private abi: Abi;
  idx: number;
  node: ProxyNode;

  constructor (abi: Abi, idx: number) {
    this.abi = abi
    this.idx = idx
    const code = new AbiQuery(this.abi)
      .fromImports()
      .byIndex(idx)
      .getCode()

    assertProxy(code)
    this.node = code
  }

  get fields (): AbiField[] {
    return basicJigAbiNode
      .fields
      .map((fieldNode, i) => new AbiField(fieldNode, i * 4))
  }

  get name () {
    return this.node.name
  }

  get pkgId (): string {
    return this.node.pkg
  }

  get kind (): CodeKind {
    return this.node.kind
  }

  ownSize () {
    return 8;
  }
}
