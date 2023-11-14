import {base16, Output, Pointer, PubKey} from "@aldea/core";
import {VM} from "../vm.js";
import {Clock} from "../clock.js";
import {ExecutionError} from "../errors.js";
import {WasmContainer} from "../wasm-container.js";
import {PkgData, Storage} from "../storage.js";
import {ExecContext} from "./exec-context.js";

export class StorageTxContext implements ExecContext {
  private _txHash: Uint8Array
  private storage: Storage
  private _signers: PubKey[]
  vm: VM
  clock: Clock
  constructor(txHash: Uint8Array, signers: PubKey[], storage: Storage, vm: VM, clock: Clock) {
    this._txHash = txHash
    this.storage = storage
    this.vm = vm
    this.clock = clock
    this._signers = signers
  }

  txHash (): Uint8Array {
    return this._txHash
  }

  stateByOutputId (id: Uint8Array): Output {
    return this.storage.byOutputId(id).orElse(() => {
      throw new ExecutionError(`output not present in utxo set: ${base16.encode(id)}`)
    })
  }

  inputByOrigin (origin: Pointer): Output {
    return this.storage.byOrigin(origin).orElse(() => { throw new ExecutionError(`unknown jig: ${origin.toString()}`)})
  }

  wasmFromPkgId (pkgId: string): WasmContainer {
    return this.storage.wasmForPackageId(pkgId)
  }

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    return this.vm.compileSources(entries, sources)
  }

  txId (): string {
    return base16.encode(this._txHash)
  }

  signers (): PubKey[] {
    return this._signers
  }
}
