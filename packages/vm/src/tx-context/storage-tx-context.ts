import {base16, Instruction, Pointer, Tx} from "@aldea/sdk-js";
import {PkgRepository, StateProvider} from "../state-interfaces.js";
import {Clock} from "../clock.js";
import {JigState} from "../jig-state.js";
import {ExecutionError} from "../errors.js";
import {WasmInstance} from "../wasm-instance.js";
import {PkgData} from "../storage.js";
import moment from "moment/moment.js";
import {TxContext} from "./tx-context.js";
import {Compiler} from "../compiler.js";

export class StorageTxContext implements TxContext {
  private _tx: Tx
  private pkgs: PkgRepository
  private states: StateProvider
  private compiler: Compiler
  clock: Clock
  constructor(tx: Tx, states: StateProvider, pkgs: PkgRepository, compiler: Compiler, clock: Clock) {
    this._tx = tx
    this.states = states
    this.pkgs = pkgs
    this.compiler = compiler
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
    return this.states.stateByOutputId(id).orElse(() => {
      throw new ExecutionError(`output not present in utxo set: ${base16.encode(id)}`)
    })
  }

  stateByOrigin (origin: Pointer): JigState {
    return this.states.stateByOrigin(origin).orElse(() => { throw new ExecutionError(`unknown jig: ${origin.toString()}`)})
  }

  wasmFromPkgId (pkgId: Uint8Array): WasmInstance {
    return this.pkgs.wasmForPackageId(pkgId)
  }

  compile (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    return this.compiler.compileSources(entries, sources)
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
