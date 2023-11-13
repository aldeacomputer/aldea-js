import {Abi, AbiQuery, CodeKind, FieldNode, ObjectNode} from "@aldea/core/abi";
import {WasmWord} from "../../wasm-word.js";
import {AbiType} from "./abi-type.js";

export class AbiField {
  // private abi: Abi;
  private node: FieldNode;
  private _offset: number;

  constructor (node: FieldNode, offset: number) {
    this.node = node
    this._offset = offset
  }

  get name(): string {
    return this.node.name
  }

  get type(): AbiType {
    return new AbiType(this.node.type)
  }

  get offset(): number {
    return this._offset
  }
}

export class AbiPlainObject {
  private abi: Abi;
  idx: number;
  private node: ObjectNode;
  private _fields: AbiField[];

  constructor (abi: Abi, idx: number, node: ObjectNode) {
    this.abi = abi
    this.idx = idx
    this.node = node

    let offset = WasmWord.fromNumber(0)
    this._fields = this.node.fields.map(node => {
      const ty = new AbiType(node.type)
      offset = offset.align(ty.ownSize())
      const field = new AbiField(node, offset.toInt())
      offset = offset.plus(ty.ownSize())
      return field
    })
  }

  get kind (): CodeKind {
    return this.node.kind
  }

  get name (): string {
    return this.node.name
  }

  get fields (): AbiField[] {
    return this._fields
  }

  ownSize () {
    const lastField = this._fields[this._fields.length - 1]
    return lastField.offset + lastField.type.ownSize()
  }
}
