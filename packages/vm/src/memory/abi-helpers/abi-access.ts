import {Abi, CodeKind, ObjectNode, TypeIdNode} from "@aldea/core/abi";
import {Option} from "../../support/option.js";
import {AbiExport} from "./abi-export.js";
import {AbiImport} from "./abi-import.js";
import {
  basicJigAbiNode,
  bigIntNode,
  coinNode,
  jigInitParamsAbiNode,
  lockAbiNode,
  outputAbiNode
} from "../../well-known-abi-nodes.js";
import {AbiType} from "./abi-type.js";
import {AbiPlainObject} from "./abi-plain-object.js";

/**
 * The ABI structure is good to be stored, but it's not very convenient to work with.
 * This is a re structured version of the ABI that is easier to work with, allowing searchs
 * by different criteria and providing all the data needed together.
 */
export class AbiAccess {
  readonly abi: Abi;
  private _exports: AbiExport[]
  private _imports: AbiImport[]
  private rtids: TypeIdNode[]

  constructor (abi: Abi) {
    this.abi = structuredClone(abi);

    [outputAbiNode, jigInitParamsAbiNode, lockAbiNode, basicJigAbiNode, bigIntNode].forEach(objNode => {
      this.abi.exports.push(
          this.abi.defs.push(objNode) - 1
      )
    });


    const importBase = this.abi.defs.some(e => e.name === 'Coin')
        ? []
        : [coinNode]

    importBase.forEach(impNode => {
      this.abi.imports.push(
          this.abi.defs.push(impNode) - 1
      )
    })

    this._exports = this.abi.exports.map((_e, index) =>
        new AbiExport(this.abi, index)
    )
    this._imports = this.abi.imports.map((_i, index) => new AbiImport(this.abi, index))
    this.rtids = this.abi.typeIds
  }

  get version (): number {
    return this.abi.version
  }

  get exports (): AbiExport[] {
    return this._exports
  }

  get imports (): AbiImport[] {
    return this._imports
  }

  get typeIds (): TypeIdNode[] {
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

  rtIdByName (name: string): Option<TypeIdNode> {
    const maybe = this.rtids.find(rtid => rtid.name === name);
    return Option.fromNullable(maybe)
  }

  rtIdById (id: number): Option<TypeIdNode> {
    const maybe = this.rtids.find(rtid => rtid.id === id);
    return Option.fromNullable(maybe)
  }

  rtidFromTypeNode (type: AbiType): Option<TypeIdNode> {
    return this.rtIdByName(type.normalizedName())
  }

  importedByName (typeName: string): Option<AbiImport> {
    const node = this._imports.find(i => i.name === typeName)
    return Option.fromNullable(node)
  }

  objectDef (typeName: string): Option<AbiPlainObject> {
    const search = this.abi.defs.find(def => def.name === typeName);
    return Option.fromNullable(search)
        .filter(def => def.kind === CodeKind.OBJECT)
        .map(def => new AbiPlainObject(-1, def as ObjectNode))
  }
}
