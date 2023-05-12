
import {Output, Tx} from "@aldea/core";
import {JigState} from "../jig-state.js";
export class ExtendedTx {
  private _tx: Tx
  private _inputs: JigState[]
  constructor(tx: Tx, inputs: Output[]) {
    this._tx = tx
    this._inputs = inputs.map(output => JigState.fromOutput(output))
  }
  get tx(): Tx {
    return this._tx
  }
  get inputs(): JigState[] {
    return this._inputs
  }
}

