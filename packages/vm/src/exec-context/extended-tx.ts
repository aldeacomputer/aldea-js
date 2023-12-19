
import {Output, Tx} from "@aldea/core";

export class ExtendedTx {
  private _tx: Tx
  private _inputs: Output[]
  constructor(tx: Tx, inputs: Output[]) {
    this._tx = tx
    this._inputs = inputs
  }
  get tx(): Tx {
    return this._tx
  }
  get inputs(): Output[] {
    return this._inputs
  }
}

