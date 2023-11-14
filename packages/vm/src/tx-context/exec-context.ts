import {Instruction, Output, Pointer, PubKey, Tx} from "@aldea/core";
import {WasmContainer} from "../wasm-container.js";
import {PkgData} from "../storage.js";

export interface ExecContext {
  txHash (): Uint8Array

  stateByOutputId (id: Uint8Array): Output

  inputByOrigin (origin: Pointer): Output

  wasmFromPkgId (pkgId: string): WasmContainer

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData>

  txId (): string

  signers (): PubKey[]
}

