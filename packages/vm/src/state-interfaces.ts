import {WasmInstance} from "./wasm-instance.js";
import {Option} from "./support/option.js";
import {JigState} from "./jig-state.js";
import {Pointer} from "@aldea/sdk-js";
import {PkgData} from "./pkg-data.js";

export interface PkgRepository {
  wasmForPackageId (moduleId: Uint8Array): WasmInstance;

  getRawPackage (id: Uint8Array) : Option<PkgData>;
}

export interface StateProvider {

    stateByOutputId(id: Uint8Array): Option<JigState>;

    stateByOrigin(origin: Pointer): Option<JigState>;
}
