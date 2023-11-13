import {Instruction, Output, Pointer, Tx} from "@aldea/core";
import {WasmContainer} from "../wasm-container.js";
import {PkgData} from "../storage.js";

export interface ExecContext {
  forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void>

  txHash (): Uint8Array

  stateByOutputId (id: Uint8Array): Output

  stateByOrigin (origin: Pointer): Output

  wasmFromPkgId (pkgId: Uint8Array): WasmContainer

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData>

  txId (): string
}

