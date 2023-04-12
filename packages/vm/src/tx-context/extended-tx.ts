
import {JigState} from "../jig-state.js";
import {Tx} from "@aldea/sdk-js";
export class ExtendedTx {
  private _tx: Tx
  private _inputs: JigState[]
  constructor(tx: Tx, inputs: JigState[]) {
    this._tx = tx
    this._inputs = inputs
  }
  get tx(): Tx {
    return this._tx
  }
  get inputs(): JigState[] {
    return this._inputs
  }
}

