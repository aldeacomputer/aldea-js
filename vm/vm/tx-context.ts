import {Instruction, Pointer, Tx} from "@aldea/sdk-js";
import {JigState} from "./jig-state.js";

interface StateProvider {

  byOutputId(id: Uint8Array): JigState;

  byOrigin(origin: Pointer): JigState;
}

export class TxContext {
  tx: Tx
  states: StateProvider
  constructor(tx: Tx, states: StateProvider) {
    this.tx = tx
    this.states = states
  }

  forEachInstruction (fn: (i: Instruction) => void): void {
    this.tx.instructions.forEach(fn)
  }

  stateByOutputId (id: Uint8Array): JigState {
    return this.states.byOutputId(id)
  }

  stateByOrigin (origin: Pointer): JigState {
    return this.states.byOrigin(origin)
  }
}

