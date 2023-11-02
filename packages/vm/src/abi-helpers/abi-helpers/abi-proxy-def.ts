import {Abi, AbiQuery, assertProxy, CodeKind, ProxyNode} from "@aldea/core/abi";

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

  get name () {
    return this.node
  }

  get pkgId (): string {
    return this.node.pkg
  }

  get kind (): CodeKind {
    return this.node.kind
  }
}
