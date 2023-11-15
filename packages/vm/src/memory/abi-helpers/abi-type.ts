import {normalizeTypeName, TypeNode} from "@aldea/core/abi";
import {emptyTn} from "../well-known-abi-nodes.js";

export class AbiType {
  private ty: TypeNode;
  constructor (ty: TypeNode) {
    this.ty = ty
  }

  ownSize(): 1 | 2 | 4 | 8 {
    switch (this.ty.name) {
      case 'bool':
      case 'u8':
      case 'i8':
        return 1
      case 'u16':
      case 'i16':
        return 2
      case 'u64':
      case 'i64':
      case 'f64':
        return 8
      default:
        return 4
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

  proxy (): AbiType {
    const otherNode = structuredClone(this.ty)
    otherNode.name = otherNode.name.replace('*', '')
    return new AbiType(otherNode)
  }
}
