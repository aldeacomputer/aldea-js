import {Abi, AbiQuery, CodeKind} from "@aldea/core/abi";
import {AbiPlainObject} from "./abi-plain-object.js";
import {AbiImportedProxy} from "./abi-imported-proxy.js";

export class AbiImport {
  private abi: Abi;
  idx: number;
  name: string;
  kind: CodeKind;
  constructor (abi: Abi, index: number) {
    this.abi = abi
    this.idx = index
    const query = new AbiQuery(this.abi).fromImports().byIndex(index)
    const imported = query.getCode()
    this.name = imported.name
    this.kind = imported.kind
  }

  toAbiProxy (): AbiImportedProxy {
    return new AbiImportedProxy(this.abi, this.idx)
  }

  toAbiObject (): AbiPlainObject {
    const node = new AbiQuery(this.abi)
      .fromImports()
      .byIndex(this.idx)
      .getObject()
    return new AbiPlainObject(this.abi, this.idx, node)
  }

  toImportedFunction (): AbiImportedProxy {
    if (this.kind !== CodeKind.PROXY_FUNCTION) {
      throw new Error(`Imported element at ${this.idx} was treated as a function but it's not.`)
    }
    return this.toAbiProxy()
  }

  toImportedClass (): AbiImportedProxy {
    if (this.kind !== CodeKind.PROXY_CLASS) {
      throw new Error(`Imported element at ${this.idx} was treated as a class but it's not.`)
    }
    return this.toAbiProxy()
  }

  toImportedInterface (): AbiImportedProxy {
    if (this.kind !== CodeKind.PROXY_INTERFACE) {
      throw new Error(`Imported element at ${this.idx} was treated as an interface but it's not.`)
    }
    return this.toAbiProxy()
  }
}

