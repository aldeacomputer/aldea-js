import {base16, Instruction, Pointer, Tx} from "@aldea/core";
import {PkgRepository, StateProvider} from "../state-interfaces.js";
import {VM} from "../vm.js";
import {Clock} from "../clock.js";
import {JigState} from "../jig-state.js";
import {ExecutionError} from "../errors.js";
import {WasmContainer} from "../wasm-container.js";
import {PkgData, Storage} from "../storage.js";
import moment from "moment/moment.js";
import {TxContext} from "./tx-context.js";

export class StorageTxContext implements TxContext {
  private _tx: Tx
  private pkgs: PkgRepository
  states: StateProvider
  vm: VM
  clock: Clock
  constructor(tx: Tx, storage: Storage, vm: VM, clock: Clock) {
    this._tx = tx
    this.states = storage
    this.pkgs = storage
    this.vm = vm
    this.clock = clock
  }

  async forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void> {
    for (const inst of this._tx.instructions) {
      await fn(inst)
    }
  }

  txHash () {
    return this.tx.hash
  }

  stateByOutputId (id: Uint8Array): JigState {
    return this.states.byOutputId(id).orElse(() => {
      throw new ExecutionError(`output not present in utxo set: ${base16.encode(id)}`)
    })
  }

  stateByOrigin (origin: Pointer): JigState {
    return this.states.byOrigin(origin).orElse(() => { throw new ExecutionError(`unknown jig: ${origin.toString()}`)})
  }

  wasmFromPkgId (pkgId: Uint8Array): WasmContainer {
    return this.pkgs.wasmForPackageId(pkgId)
  }

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    return this.vm.compileSources(entries, sources)
  }

  get tx (): Tx {
    return this._tx
  }

  hash (): Uint8Array {
    return this._tx.hash
  }

  now (): moment.Moment {
    return this.clock.now()
  }
}
