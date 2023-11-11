import {Abi, TypeIdNode} from "@aldea/core/abi";
// import {
//   basicJigAbiNode,
//   coinNode,
//   emptyTn,
//   JIG_TOP_CLASS_NAME,
//   jigInitParamsAbiNode,
//   jigNode,
//   lockAbiNode,
//   outputAbiNode
// } from "./well-known-abi-nodes.js";
import {Option} from "../support/option.js";
import {AbiExport} from "./abi-helpers/abi-export.js";
import {AbiImport} from "./abi-helpers/abi-import.js";
import {ExecutionError} from "../errors.js";
import {basicJigAbiNode, jigInitParamsAbiNode, lockAbiNode, outputAbiNode} from "./well-known-abi-nodes.js";
import {AbiType} from "./abi-helpers/abi-type.js";

export class AbiAccess {
  readonly abi: Abi;
  // readonly abi: Abi;
  private _exports: AbiExport[]
  private _imports: AbiImport[]
  private rtids: TypeIdNode[]
  constructor(abi: Abi) {
    this.abi = structuredClone(abi);

    [outputAbiNode, jigInitParamsAbiNode, lockAbiNode, basicJigAbiNode].forEach(objNode => {
      this.abi.exports.push(
        this.abi.defs.push(objNode) - 1
      )
    })

    this._exports = this.abi.exports.map((_e, index) =>
      new AbiExport(this.abi, index)
    )
    this._imports = this.abi.imports.map((_i, index) => new AbiImport(abi, index))
    this.rtids = this.abi.typeIds
  }

  get version(): number {
    return this.abi.version
  }

  get exports(): AbiExport[] {
    return this._exports
  }

  get imports(): AbiImport[] {
    return this._imports
  }

  get typeIds(): TypeIdNode[] {
    return this.typeIds
  }

  exportedByName (exportName: string): Option<AbiExport> {
    const name = exportName.replace('*', '')
    const exported = this._exports.find(e => e.name === name);
    return Option.fromNullable(exported)
  }

  exportedByIdx (idx: number): Option<AbiExport> {
    const exported = this._exports[idx];
    return Option.fromNullable(exported)
  }

  rtIdByName(name: string): Option<TypeIdNode> {
    const maybe = this.rtids.find(rtid => rtid.name === name);
    return Option.fromNullable(maybe)
  }

  rtIdById(id: number): Option<TypeIdNode> {
    const maybe = this.rtids.find(rtid => rtid.id === id);
    return Option.fromNullable(maybe)
  }

  rtidFromTypeNode(type: AbiType): Option<TypeIdNode> {
    return this.rtIdByName(type.normalizedName())
  }

  outputRtid(): TypeIdNode {
    return Option.fromNullable(
      this.rtids.find(rtid => rtid.name == 'Output')
    ).expect(new ExecutionError('Output rtid not found'))
  }

  lockRtid(): TypeIdNode {
    return Option.fromNullable(
      this.rtids.find(rtid => rtid.name == 'Lock')
    ).expect(new ExecutionError('Lock rtid not found'))
  }

  importedByIndex(importedIndex: number): Option<AbiImport> {
    return Option.fromNullable(this._imports[importedIndex])
  }

  importedByName(typeName: string): Option<AbiImport> {
    const node = this._imports.find(i => i.name === typeName)
    return Option.fromNullable(node)
  }
}
