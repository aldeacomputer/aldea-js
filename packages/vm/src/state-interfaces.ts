import {WasmContainer} from "./wasm-container.js";
import {Option} from "./support/option.js";
import {JigState} from "./jig-state.js";
import {Pointer} from "@aldea/core";

export interface PkgRepository {
  wasmForPackageId (moduleId: Uint8Array): WasmContainer;
}

export interface StateProvider {

    byOutputId(id: Uint8Array): Option<JigState>;

    byOrigin(origin: Pointer): Option<JigState>;
}
