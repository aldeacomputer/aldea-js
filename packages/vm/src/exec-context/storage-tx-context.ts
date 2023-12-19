import {base16, Output, Pointer, PubKey} from "@aldea/core";
import {VM} from "../vm.js";
import {ExecutionError} from "../errors.js";
import {WasmContainer} from "../wasm-container.js";
import {MemStorage} from "../storage/mem-storage.js";
import {ExecContext} from "./exec-context.js";
import {PkgData} from "../storage/pkg-data.js";

/**
 * TxContext based on a mem storage. Ideal for development.
 * Not ideal for production where transactions are executed with inputs provided by users.
 */
export class StorageTxContext implements ExecContext {
  private _txHash: Uint8Array
  private storage: MemStorage
  private _signers: PubKey[]
  vm: VM

  constructor (txHash: Uint8Array, signers: PubKey[], storage: MemStorage, vm: VM) {
    this._txHash = txHash
    this.storage = storage
    this.vm = vm
    this._signers = signers
  }

  txHash (): Uint8Array {
    return this._txHash
  }

  outputById (id: Uint8Array): Output {
    return this.storage.outputByHash(id).orElse(() => {
      throw new ExecutionError(`output not present in utxo set: ${base16.encode(id)}`)
    })
  }

  inputByOrigin (origin: Pointer): Output {
    return this.storage.outputByOrigin(origin).orElse(() => { throw new ExecutionError(`unknown jig: ${origin.toString()}`)})
  }

  wasmFromPkgId (pkgId: string): WasmContainer {
    return this.storage.wasmForPackageId(pkgId).expect(
        new ExecutionError(`Missing package: ${pkgId}`)
    )
  }

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    return this.vm.compileSources(entries, sources)
  }

  signers (): PubKey[] {
    return this._signers
  }
}
