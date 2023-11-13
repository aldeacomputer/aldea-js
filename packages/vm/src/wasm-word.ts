import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {BufReader, BufWriter} from "@aldea/core";
import {WasmValue} from "./wasm-container.js";

type WasmArg = number | bigint

export class WasmWord {
  private value: ArrayBuffer;

  constructor (bytes: ArrayBuffer) {
    if (bytes.byteLength > 8) {
      throw new Error('wrong number of bytes')
    }
    this.value = new ArrayBuffer(8)
    Buffer.from(this.value).set(Buffer.from(bytes))
  }

  static fromNumber (number: number): WasmWord {
    const w = new BufWriter({ size: 8 })
    if (Number.isInteger(number)) {
      w.writeU64(number)
    } else {
      w.writeF64(number)
    }
    return new this(w.data)
  }

  static fromBigInt (bigint: bigint): WasmWord {
    const w = new BufWriter({size: 8})
    w.writeU64(bigint)
    return new this(w.data)
  }

  static fromNumeric (value: WasmArg): WasmWord {
    if (typeof value === 'bigint') {
      return this.fromBigInt(value)
    } else {
      return this.fromNumber(Number(value))
    }
  }

  static fromReader (read: BufReader, ty: AbiType = AbiType.fromName('u32')): WasmWord {
    return new WasmWord(read.readFixedBytes(ty.ownSize()))
  }

  toInt (): number {
    return Buffer.from(this.value).readInt32LE()
  }

  toUInt (): number {
    return Buffer.from(this.value).readUInt32LE()
  }

  toFloat (): number {
    return new BufReader(new Uint8Array(this.value)).readF64()
  }

  toBigInt (): bigint {
    return Buffer.from(this.value).readBigInt64LE()
  }

  toBool (): boolean {
    return this.toInt() !== 0
  }

  plus(n: number): WasmWord {
    let num = Buffer.from(this.value).readUInt32LE()
    return WasmWord.fromNumber(num + n)
  }

  minus(n: number): WasmWord {
    let num = this.toInt()
    return WasmWord.fromNumber(num - n)
  }

  align (toSize: number): WasmWord {
    const self = this.toInt()
    const rem = self % toSize
    if (rem === 0) {
      return this
    } else {
      return WasmWord.fromNumber(self + toSize - rem)
    }
  }

  serialize(ty: AbiType): Uint8Array {
    // let writer: BufWriter
    // switch (ty.name) {
    //   case 'bool':
    //   case 'u8':
    //   case 'i8':
    //     writer = new BufWriter({size: 1})
    //     writer.writeU8(this.toNumber())
    //     return writer.data
    //   case 'u16':
    //   case 'i16':
    //     writer = new BufWriter({size: 2})
    //     writer.writeU16(this.toNumber())
    //     return writer.data
    //   case 'u64':
    //   case 'i64':
    //     writer = new BufWriter({size: 8})
    //     writer.writeU64(this.toBigInt())
    //     return writer.data
    //   case 'f32':
    //     writer = new BufWriter({size: 4})
    //     writer.writeF32(this.toNumber())
    //     return writer.data
    //   case 'f64':
    //     writer = new BufWriter({size: 8})
    //     writer.writeF64(this.toNumber())
    //     return writer.data
    //   default:
    //     writer = new BufWriter({size: 4})
    //     writer.writeU32(this.toNumber())
    //     return writer.data
    // }
    return new Uint8Array(this.value, 0, ty.ownSize())
  }

  toWasmArg (abiType: AbiType): WasmArg {
    if (['u64', 'i64'].includes(abiType.name)) return this.toBigInt()
    return this.toInt()
  }

  equals (another: WasmWord) {
    return Buffer.from(this.value).equals(Buffer.from(another.value));
  }
}
