import {Address, Output, Pointer, Tx} from "@aldea/core";
import {ExecutionResult} from "../execution-result.js";
import {Option} from "../support/option.js";
import {WasmContainer} from "../wasm-container.js";

import {PkgData} from "./pkg-data.js";

/**
 * An interface for a generic storage object.
 */
export interface Storage {
  /**
   * Persists a transaction.
   *
   * @param {Tx} tx - The transaction to persist.
   *
   * @return {void}
   */
  persistTx (tx: Tx): Promise<void>;

  /**
   * Persists the execution result of a transaction.
   *
   * @param {ExecutionResult} txExecution - The execution result of the transaction.
   * @return {Promise<void>} - A promise that resolves when the execution result is persisted successfully.
   */
  persistExecResult (txExecution: ExecutionResult): Promise<void>;

  /**
   * Persiste a new UTXO updating all needed indexes
   *
   * @param output - The output to add as a UTXO.
   * @returns A Promise that resolves when the UTXO has been added successfully.
   */
  addUtxo (output: Output): Promise<void>;

  /**
   * Retrieves the output id of the tip of the jig with the given origin.
   *
   * @param {Pointer} origin - The origin to retrieve the tip for.
   * @returns {Option<string>} - An option containing the tip if found, otherwise None.
   */
  tipFor (origin: Pointer): Option<string>;

  // TODO: Make async
  getTx (txid: string): Option<Tx>;

  // TODO: Make async
  getExecResult (txid: string): Option<ExecutionResult>;

  // TODO: Make async
  addPackage (id: Uint8Array, pkgData: PkgData): void;

  // TODO: Make async
  getPkg (id: string): Option<PkgData>;

  // TODO: Make async
  getHistoricalUtxo (outputId: Uint8Array): Option<Output>;

  // TODO: Make async
  utxosForAddress (userAddr: Address): Output[];

  // TODO: Make async
  utxosForLock (lockHex: string): Output[];

  // TODO: Make async
  outputByHash (hash: Uint8Array): Option<Output>;

  // TODO: Make async
  outputById (id: string): Option<Output>;

  // TODO: Make async
  outputByOrigin (origin: Pointer): Option<Output>;

  // TODO: Make async
  wasmForPackageId (moduleId: string): Option<WasmContainer>;
}
