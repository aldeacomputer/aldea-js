import {Instruction, Pointer, Tx} from "@aldea/sdk-js";
import {JigState} from "./jig-state.js";
import {Option} from "./support/option.js";

export interface StateProvider {

  byOutputId(id: Uint8Array): Option<JigState>;

  byOrigin(origin: Pointer): Option<JigState>;
}

export class TxContext {
  private _tx: Tx
  states: StateProvider
  constructor(tx: Tx, states: StateProvider) {
    this._tx = tx
    this.states = states
  }

  async forEachInstruction (fn: (i: Instruction) => Promise<void>): Promise<void> {
    for (const inst of this._tx.instructions) {
      await fn(inst)
    }
  }

  stateByOutputId (id: Uint8Array): JigState {
    return this.states.byOutputId(id).get()
  }

  stateByOrigin (origin: Pointer): JigState {
    return this.states.byOrigin(origin).get()
  }

  get tx (): Tx {
    return this._tx
  }

  hash (): Uint8Array {
    return this._tx.hash
  }
}

