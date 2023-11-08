import {WasmContainer} from "../wasm-container.js";
import {TypeNode} from "@aldea/core/abi";
import {WasmWord} from "../wasm-word.js";
import {BufReader} from "@aldea/core";

export class NewLowerValue {
  private container: WasmContainer;

  constructor (container: WasmContainer) {
    this.container = container
  }

  lower(encoded: Uint8Array, ty: TypeNode): WasmWord {
    const reader = new BufReader(encoded)
    switch (ty.name) {
      case 'u8':
        return WasmWord.fromNumber(reader.readU8())
      case 'u16':
        return WasmWord.fromNumber(reader.readU16())
      case 'u32':
        return WasmWord.fromNumber(reader.readU32())
      case 'u64':
        return WasmWord.fromBigInt(reader.readU64())
      case 'i8':
        return WasmWord.fromNumber(reader.readI8())
      case 'i16':
        return WasmWord.fromNumber(reader.readI16())
      case 'i32':
        return WasmWord.fromNumber(reader.readI32())
      case 'i64':
        return WasmWord.fromBigInt(reader.readI64())
      default:
        throw new Error(`unknown type: ${ty.name}`)
    }
  }
}
