import {WasmInstance} from "./wasm-instance.js";

export interface PkgRepository {
  wasmForPackageId (moduleId: Uint8Array): WasmInstance;
}
