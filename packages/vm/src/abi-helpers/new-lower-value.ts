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
    return WasmWord.fromNumber(reader.readU8())
  }
}
