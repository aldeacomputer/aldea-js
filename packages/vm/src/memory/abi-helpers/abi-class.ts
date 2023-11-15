import {Abi, AbiQuery, ClassNode, CodeKind, FieldNode, MethodNode} from "@aldea/core/abi";
import {Option} from "../../support/option.js";
import {AbiType} from "./abi-type.js";
import {AbiField} from "./abi-plain-object.js";
import {WasmWord} from "../../wasm-word.js";
import {AbiMethod} from "./abi-method.js";
import {lockTypeNode, outputTypeNode} from "../well-known-abi-nodes.js";
import {AbiImportedProxy} from "./abi-imported-proxy.js";
import {ProxyDef} from "./proxy-def.js";

const BASE_FIELDS = [{
    name: '$output',
    type: outputTypeNode
  },
  {
    name: '$lock',
    type: lockTypeNode
  }
]

function createAbiMethods (cls: ClassNode[]) {
  return cls
    .map<Array<[MethodNode, string]>>(cls => cls.methods.map(m => [m, cls.name]))
    .flat()
    .filter(([m, _]) => m.name !== 'constructor')
    .map(([m, className], i) =>  new AbiMethod(i, className, m))
}

export class AbiClass {
  private abi: Abi;
  idx: number;
  private node: ClassNode;
  private readonly _methods: AbiMethod[];
  private readonly _fields: AbiField[];
  private _constructor: AbiMethod

  constructor (abi: Abi, idx: number) {
    this.abi = abi
    this.idx = idx
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    this.node = query.getClass()
    const parents =  query.getClassParents()
    const constructorNode = this.node.methods.find(m => m.name === 'constructor')
    if (!constructorNode) {
      throw new Error('malformed abi, missing constructor for class')
    }
    this._constructor = new AbiMethod(0, this.node.name, constructorNode)

    this._methods = createAbiMethods([...parents, this.node])

    let offset = WasmWord.fromNumber(0)
    const fields = [...BASE_FIELDS, ...parents.map(p => p.fields).flat(), ...this.node.fields]
    this._fields = fields.map(node => {
      const ty = new AbiType(node.type)
      offset = offset.align(ty.ownSize())
      const field = new AbiField(node, offset.toInt())
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

  constructorDef(): AbiMethod {
    return this._constructor
  }

  ownFields (): AbiField[] {
    return this._fields.slice(2)
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

  fieldByName(name: string): Option<AbiField> {
    const maybeField = this._fields.find(f => f.name === name)
    return Option.fromNullable(maybeField)
  }

  toProxyDef () {
    return new ProxyDef(this.name)
  }

  ownTy (): AbiType {
    return AbiType.fromName(`*${this.name}`)
  }

  hierarchyNames (): string[] {
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    return query.getClassParents()
      .map(node => node.name)
  }
}
