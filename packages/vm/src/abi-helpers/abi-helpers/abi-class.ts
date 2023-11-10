import {Abi, AbiQuery, ClassNode, CodeKind, FieldNode} from "@aldea/core/abi";
import {Option} from "../../support/option.js";
import {AbiType} from "./abi-type.js";
import {AbiField} from "./abi-plain-object.js";
import {WasmWord} from "../../wasm-word.js";
import {AbiMethod} from "./abi-method.js";
import {lockTypeNode, outputTypeNode} from "../well-known-abi-nodes.js";

const BASE_FIELDS = [{
    name: '$output',
    type: outputTypeNode
  },
  {
    name: '$lock',
    type: lockTypeNode
  }
]

export class AbiClass {
  private abi: Abi;
  idx: number;
  private node: ClassNode;
  private readonly _methods: AbiMethod[];
  private readonly _fields: AbiField[];

  constructor (abi: Abi, idx: number) {
    this.abi = abi
    this.idx = idx
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    this.node = query.getClass()
    this._methods = this.node.methods.map((_m, i) => new AbiMethod(this.abi, this.idx, i))

    let offset = WasmWord.fromNumber(0)
    const fields = [...BASE_FIELDS, ...this.node.fields]
    this._fields = fields.map(node => {
      const ty = new AbiType(node.type)
      offset = offset.align(ty.ownSize())
      const field = new AbiField(node, offset.toNumber())
      offset = offset.plus(ty.ownSize())
      return field
    })
  }

  get name (): string {
    return this.node.name
  }

  get typeName(): string {
    return `*${this.node.name}`
  }

  get extends (): string {
    return this.node.extends
  }

  get fields (): AbiField[] {
    return this._fields
  }

  // allNativeFields (): FieldNode[] {
  //   const query = new AbiQuery(this.abi)
  //   query.fromExports().byIndex(this.idx)
  //   const parents = query.getClassParents()
  //   return parents.map(p => p.fields).flat()
  // }

  nativeFields (): FieldNode[] {
    return this.node.fields
  }

  get methods (): AbiMethod[] {
    return this._methods
  }

  get implements (): string[] {
    return this.node.implements
  }


  get kind (): CodeKind.CLASS {
    return this.node.kind
  }

  ownSize (): number {
    const lastField = this._fields[this._fields.length - 1]
    return lastField.offset + lastField.type.ownSize()
  }

  methodByName (name: string): Option<AbiMethod> {
    const method = this._methods.find(m => m.name == name)
    return Option.fromNullable(method)
  }

  methodByIdx (methodIdx: number): Option<AbiMethod> {
    return Option.fromNullable(this.methods[methodIdx])
  }

  isSubclassByIndex(parentIdx: number): boolean {
    const query = new AbiQuery(this.abi)
    const parentNode = query.fromExports().byIndex(parentIdx).byIndex(parentIdx).getClass()
    query.reset()
    const hierarchy = query.fromExports().byIndex(this.idx).getClassParents()
    return hierarchy.some(ancestor => ancestor.name === parentNode.name)
  }

  fieldByName(name: string): Option<FieldNode> {
    const maybeField = this.fields.find(f => f.name === name)
    return Option.fromNullable(maybeField)
  }
}
