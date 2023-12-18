import {Output, Pointer, PubKey} from "@aldea/core";
import {WasmContainer} from "../wasm-container.js";
import {PkgData} from "../storage.js";

/**
 * This interface represents everything that is needed for a VM
 * to execute a specific transaction.
 *
 * Notice that all methods are sync. Transaction execution is always sync except for deploys, but
 * the VM ensures to simulate sync there too.
 */
export interface ExecContext {
  /**
   * Retrieves the transaction hash (id) for the transaction being currently executed.
   *
   * @return {Uint8Array} The transaction hash (32 bytes).
   */
  txHash (): Uint8Array

  /**
   * Retrieves an output from the context, searching by id.
   *
   * @param {Uint8Array} id - The ID of the output.
   * @return {Output} - The Output object representing the state associated with the given output ID.
   */
  outputById (id: Uint8Array): Output

  /**
   * Retrieves an output from context matching given origin.
   *
   * @param {Pointer} origin - The origin to retrieve the output for.
   * @return {Output} - The output corresponding to the provided origin.
   */
  inputByOrigin (origin: Pointer): Output

  /**
   * Retrieves a WasmContainer initialized with the package matching the given id.
   *
   * @param {string} pkgId - The package ID of the Wasm container to retrieve.
   * @return {WasmContainer} - The Wasm container associated with the package ID.
   */
  wasmFromPkgId (pkgId: string): WasmContainer

  /**
   * Compiles the given entries using the provided sources.
   *
   * @param {string[]} entries - An array of entry strings to compile.
   * @param {Map<string, string>} sources - A map containing the source files to compile the entries from.
   * @return {Promise<PkgData>} A Promise that resolves to the compiled package data.
   */
  compile (entries: string[], sources: Map<string, string>): Promise<PkgData>

  /**
   * Retrieves the list of pubkeys that have signed the current tx.
   * This allows the VM to exec instruction by instruction and separates
   * the execution time from the signature validation time.
   *
   * @return {PubKey[]} The list of signers represented by an array of PubKey objects.
   */
  signers (): PubKey[]
}

