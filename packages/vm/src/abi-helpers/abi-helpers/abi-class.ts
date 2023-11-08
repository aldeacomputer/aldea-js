import {Abi, AbiQuery, ArgNode, ClassNode, CodeKind, FieldNode, MethodNode, TypeNode} from "@aldea/core/abi";
import {emptyTn, lockTypeNode, outputTypeNode} from "../well-known-abi-nodes.js";
import {Option} from "../../support/option.js";

export class AbiMethod {
  private abi: Abi;
  idx: number;
  node: MethodNode;
  private _className;

  constructor(abi: Abi, classIdx: number, methodIdx: number) {
    this.abi = abi;
    this.idx = methodIdx
    const query = new AbiQuery(this.abi)
    const classNode = query.fromExports().byIndex(classIdx).getClass()
    this.node = classNode.methods[methodIdx]
    this._className = classNode.name
  }

  get name(): string {
    return this.node.name
  }

  get args(): ArgNode[] {
    return this.node.args
  }

  get rtype(): TypeNode {
    return Option.fromNullable(this.node.rtype).orElse(() => emptyTn(this.className))
  }

  get className(): string {
    return this._className
  }
}

export class AbiClass {
  private abi: Abi;
  idx: number;
  private node: ClassNode;
  private _methods: AbiMethod[];

  constructor (abi: Abi, idx: number) {
    this.abi = abi
    this.idx = idx
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    this.node = query.getClass()
    this._methods = this.node.methods.map((_m, i) => new AbiMethod(this.abi, this.idx, i))
  }

  get name (): string {
    return this.node.name
  }

  get extends (): string {
    return this.node.extends
  }

  get fields (): FieldNode[] {
    return [
      {
        name: '$output',
        type: outputTypeNode
      },
      {
        name: '$lock',
        type: lockTypeNode
      },
      ...this.allNativeFields()
    ]
  }

  allNativeFields (): FieldNode[] {
    const query = new AbiQuery(this.abi)
    query.fromExports().byIndex(this.idx)
    const parents = query.getClassParents()
    return parents.map(p => p.fields).flat()
  }

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
