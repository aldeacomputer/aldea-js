import {
  Abi,
  CodeKind,
  InterfaceNode,
  normalizeTypeName,
  ObjectNode,
  TypeIdNode,
  TypeNode
} from "@aldea/core/abi";
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
import {AbiClass} from "./abi-helpers/abi-class.js";
import {AbiFunction} from "./abi-helpers/abi-function.js";
import {AbiProxyDef} from "./abi-helpers/abi-proxy-def.js";

export class AbiAccess {
  readonly abi: Abi;
  private _exports: AbiExport[]
  private _imports: AbiImport[]
  private rtids: TypeIdNode[]
  constructor(abi: Abi) {
    this.abi = abi
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
    return this.exports
  }

  get imports(): AbiImport[] {
    return this._imports
  }

  get typeIds(): TypeIdNode[] {
    return this.typeIds
  }

  exportedByName (exportName: string): Option<AbiExport> {
    const exported = this.exports.find(e => e.name === exportName);
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

  rtidFromTypeNode(type: TypeNode): Option<TypeIdNode> {
    const normalized = normalizeTypeName(type)
    return this.rtIdByName(normalized)
  }

  importedByIndex(importedIndex: number): Option<AbiImport> {
    return Option.fromNullable(this._imports[importedIndex])
  }

  importedByName(typeName: string): Option<AbiImport> {
    const node = this._imports.find(i => i.name === typeName)
    return Option.fromNullable(node)
  }
}
