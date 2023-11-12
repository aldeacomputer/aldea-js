import {AbiType} from "./abi-helpers/abi-helpers/abi-type.js";
import {BufReader, BufWriter} from "@aldea/core";
import {NewMemory} from "./new-memory.js";

type WasmArg = number | bigint

export class WasmWord {
  value: number | bigint;

  constructor (value: number | bigint) {
    this.value = value
  }

  static fromNumber (number: number): WasmWord {
    return new this(number);
  }

  // static fromMem (mem: NewMemory, ptr: WasmWord): WasmWord {
  //   return new WasmWord(mem.read(ptr, 4).readU32())
  // }

  static fromReader (read: BufReader, ty: AbiType = AbiType.fromName('u32')): WasmWord {
    switch (ty.ownSize()) {
      case 1:
        return WasmWord.fromNumber(read.readU8())
      case 2:
        return WasmWord.fromNumber(read.readU16())
      case 4:
        return WasmWord.fromNumber(read.readU32())
      case 8:
        return WasmWord.fromNumber(read.readU32())
      default:
        throw new Error(`unknown size: ${ty.ownSize()}`)
    }
  }

  toNumber (): number {
    return Number(this.value)
  }

  toBigInt (): bigint {
    return BigInt(this.value)
  }

  static fromBigInt (bigint: bigint): WasmWord {
    return new this(bigint)
  }

  toBool (): boolean {
    return this.toNumber() !== 0
  }

  plus(n: number): WasmWord {
    return new WasmWord(this.toNumber() + n)
  }

  minus(n: number): WasmWord {
    return new WasmWord(this.toNumber() - n)
  }

  align (toSize: number): WasmWord {
    const self = this.toNumber()
    const rem = self % toSize
    if (rem === 0) {
      return this
    } else {
      return new WasmWord(self + toSize - rem)
    }
  }

  serialize(ty: AbiType): Uint8Array {
    let writer: BufWriter
    switch (ty.name) {
      case 'bool':
      case 'u8':
      case 'i8':
        writer = new BufWriter({size: 1})
        writer.writeU8(this.toNumber())
        return writer.data
      case 'u16':
      case 'i16':
        writer = new BufWriter({size: 2})
        writer.writeU16(this.toNumber())
        return writer.data
      case 'u64':
      case 'i64':
        writer = new BufWriter({size: 8})
        writer.writeU64(this.toBigInt())
        return writer.data
      case 'f32':
        writer = new BufWriter({size: 4})
        writer.writeF32(this.toNumber())
        return writer.data
      case 'f64':
        writer = new BufWriter({size: 8})
        writer.writeF64(this.toNumber())
        return writer.data
      default:
        writer = new BufWriter({size: 4})
        writer.writeU32(this.toNumber())
        return writer.data
    }
  }

  toWasmArg (abiType: AbiType): WasmArg {
    if (['u64', 'i64'].includes(abiType.name)) return this.toBigInt()
    return this.toNumber()
  }
}
