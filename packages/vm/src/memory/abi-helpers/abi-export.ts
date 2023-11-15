import {Abi, AbiQuery, CodeKind} from "@aldea/core/abi";
import {AbiPlainObject} from "./abi-plain-object.js";
import {AbiClass} from "./abi-class.js";
import {AbiFunction} from "./abi-function.js";
import {AbiInterface} from "./abi-interface.js";

export class AbiExport {
  private abi: Abi;
  idx: number;
  name: string;
  kind: CodeKind;

  constructor (abi: Abi, index: number) {
    this.abi = abi
    this.idx = index
    const code = new AbiQuery(abi)
      .fromExports()
      .byIndex(this.idx)
      .getCode()
    this.name = code.name
    this.kind = code.kind
  }

  toAbiClass(): AbiClass {
    return new AbiClass(this.abi, this.idx)
  }

  toAbiFunction (): AbiFunction {
    return new AbiFunction(this.abi, this.idx)
  }

  toAbiObject (): AbiPlainObject {
    const node = new AbiQuery(this.abi)
        .fromExports()
        .byIndex(this.idx)
        .getObject()
    return new AbiPlainObject(this.idx, node)
  }

  toAbiInterface (): AbiInterface {
    return new AbiInterface(this.abi, this.idx)
  }
}

