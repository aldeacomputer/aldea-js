import {Instruction, Pointer, Tx} from "@aldea/sdk-js";
import {JigState} from "../jig-state.js";
import moment from "moment";
import {WasmInstance} from "../wasm-instance.js";
import {PkgData} from "../storage.js";

export interface TxContext {
  forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void>

  txHash (): Uint8Array

  stateByOutputId (id: Uint8Array): JigState

  stateByOrigin (origin: Pointer): JigState

  wasmFromPkgId (pkgId: Uint8Array): WasmInstance

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData>

  getWasmInstance (pkg: PkgData): WasmInstance
  get tx (): Tx

  hash (): Uint8Array

  now (): moment.Moment
}

