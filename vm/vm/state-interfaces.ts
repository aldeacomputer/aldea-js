import {WasmInstance} from "./wasm-instance.js";

export interface PkgRepository {
  wasmForPackage (moduleId: Uint8Array): WasmInstance;
}
