import {Instruction, Pointer, Tx} from "@aldea/core";
import {JigState} from "../jig-state.js";
import moment from "moment";
import {WasmContainer} from "../wasm-container.js";
import {PkgData} from "../storage.js";

export interface TxContext {
  forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void>

  txHash (): Uint8Array

  stateByOutputId (id: Uint8Array): JigState

  stateByOrigin (origin: Pointer): JigState

  wasmFromPkgId (pkgId: Uint8Array): WasmContainer

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData>

  get tx (): Tx

  now (): moment.Moment
}

