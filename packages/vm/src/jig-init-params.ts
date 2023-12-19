import {BufWriter, Pointer} from "@aldea/core";
import {Lock} from "./locks/lock.js";
import {AbiType} from "./memory/abi-helpers/abi-type.js";
import {jigInitParamsTypeNode} from "./well-known-abi-nodes.js";
import {WasmContainer} from "./wasm-container.js";
import {WasmWord} from "./wasm-word.js";

/**
 * Simple data structure to lower the data needed to initialize a jig.
 */
export class JigInitParams {
  origin: Pointer
  location: Pointer
  classPtr: Pointer
  lock: Lock

  constructor (origin: Pointer, location: Pointer, classPtr: Pointer, lock: Lock) {
    this.origin = origin
    this.location = location
    this.classPtr = classPtr
    this.lock = lock
  }

  serialize (): Uint8Array {
    const w = new BufWriter()
    w.writeBytes(this.origin.toBytes())
    w.writeBytes(this.location.toBytes())
    w.writeBytes(this.classPtr.toBytes())
    const lock= this.lock.coreLock();
    w.writeU32(lock.type)
    w.writeBytes(lock.data)
    return w.data
  }

  lowerInto (from: WasmContainer): WasmWord {
    return from.low.lower(this.serialize(), new AbiType(jigInitParamsTypeNode))
  }
}
