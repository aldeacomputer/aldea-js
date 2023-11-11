import {normalizeTypeName, TypeNode} from "@aldea/core/abi";
import {emptyTn} from "../well-known-abi-nodes.js";

export class AbiType {
  private ty: TypeNode;
  constructor (ty: TypeNode) {
    this.ty = ty
  }

  ownSize(): number {
    switch (this.ty.name) {
      case 'bool': return 1
      case 'u8': return 1
      case 'i8': return 1
      case 'u16': return 2
      case 'i16': return 2
      case 'u64': return 8
      case 'i64': return 8
      case 'f64': return 8
      default: return 4
    }
  }

  get name(): string {
    return this.ty.name
  }

  get args(): AbiType[] {
    return this.ty.args.map(ty => new AbiType(ty))
  }

  get nullable(): boolean {
    return this.ty.nullable
  }

  static fromName(name: string): AbiType {
    return new this(emptyTn(name))
  }

  static buffer(): AbiType {
    return this.fromName('ArrayBuffer')
  }

  static u32(): AbiType {
    return this.fromName('u32')
  }

  normalizedName () {
    return normalizeTypeName(this.ty);
  }
}
