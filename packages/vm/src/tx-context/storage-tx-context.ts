import {base16, Instruction, Output, Pointer, Tx} from "@aldea/core";
import {VM} from "../vm.js";
import {Clock} from "../clock.js";
import {ExecutionError} from "../errors.js";
import {WasmContainer} from "../wasm-container.js";
import {PkgData, Storage} from "../storage.js";
import moment from "moment/moment.js";
import {ExecContext} from "./exec-context.js";

export class StorageTxContext implements ExecContext {
  private _tx: Tx
  private storage: Storage
  vm: VM
  clock: Clock
  constructor(tx: Tx, storage: Storage, vm: VM, clock: Clock) {
    this._tx = tx
    this.storage = storage
    this.vm = vm
    this.clock = clock
  }

  async forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void> {
    for (const inst of this._tx.instructions) {
      await fn(inst)
    }
  }

  txHash () {
    return this._tx.hash
  }

  stateByOutputId (id: Uint8Array): Output {
    return this.storage.byOutputId(id).orElse(() => {
      throw new ExecutionError(`output not present in utxo set: ${base16.encode(id)}`)
    })
  }

  stateByOrigin (origin: Pointer): Output {
    return this.storage.byOrigin(origin).orElse(() => { throw new ExecutionError(`unknown jig: ${origin.toString()}`)})
  }

  wasmFromPkgId (pkgId: Uint8Array): WasmContainer {
    return this.storage.wasmForPackageId(pkgId)
  }

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    return this.vm.compileSources(entries, sources)
  }

  txId (): string {
    return this._tx.id
  }
}
