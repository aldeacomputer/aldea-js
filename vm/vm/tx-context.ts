import {base16, Instruction, Pointer, Tx} from "@aldea/sdk-js";
import {JigState} from "./jig-state.js";
import {Option} from "./support/option.js";
import {ExecutionError} from "./errors.js";
import {Clock} from "./clock.js";
import moment from "moment";
import {WasmInstance} from "./wasm-instance.js";
import {VM} from "./vm.js";
import {PkgData} from "./storage.js";

export interface StateProvider {

  byOutputId(id: Uint8Array): Option<JigState>;

  byOrigin(origin: Pointer): Option<JigState>;
}

export class TxContext {
  private _tx: Tx
  states: StateProvider
  vm: VM
  clock: Clock
  constructor(tx: Tx, states: StateProvider, vm: VM, clock: Clock) {
    this._tx = tx
    this.states = states
    this.vm = vm
    this.clock = clock
  }

  async forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void> {
    for (const inst of this._tx.instructions) {
      await fn(inst)
    }
  }

  stateByOutputId (id: Uint8Array): JigState {
    return this.states.byOutputId(id).orElse(() => {
      throw new ExecutionError(`output not present in utxo set: ${base16.encode(id)}`)
    })
  }

  stateByOrigin (origin: Pointer): JigState {
    return this.states.byOrigin(origin).orElse(() => { throw new ExecutionError(`unknown jig: ${origin.toString()}`)})
  }

  wasmFromPkgId (pkgId: Uint8Array): WasmInstance {
    return this.vm.wasmForPackageId(pkgId)
  }

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    return this.vm.compileSources(entries, sources)
  }

  getWasmInstance (pkg: PkgData): WasmInstance {
    return this.vm.wasmFromPackageData(pkg)
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

