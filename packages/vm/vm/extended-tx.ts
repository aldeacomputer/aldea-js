import {base16, Instruction, Pointer, Tx} from "@aldea/sdk-js";
import {JigState} from "./jig-state.js";
import {ExecutionError} from "./errors.js";
import {Clock} from "./clock.js";
import moment from "moment";
import {WasmInstance} from "./wasm-instance.js";
import {PkgData} from "./storage.js";


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

