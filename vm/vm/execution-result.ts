import {JigState} from "./jig-state.js";
import {Abi} from "@aldea/compiler/abi";
import {ExecutionError} from "./errors.js";
import {Tx} from "@aldea/sdk-js";
import {calculatePackageId} from "./calculate-package-id.js";
import moment from "moment";
import {Clock} from "./clock.js";
import {Option} from "./support/option.js";

export class PackageDeploy {
  sources: Map<string, string>
  entries: string[]
  bytecode: Uint8Array
  abi: Abi

  constructor(sources: Map<string, string>, entries: string[], bytecode: Uint8Array, abi: Abi) {
    this.sources = sources
    this.entries = entries
    this.bytecode = bytecode
    this.abi = abi
  }

  get hash (): Uint8Array {
    return calculatePackageId(this.entries, this.sources)
  }
}

export class ExecutionResult {
  outputs: JigState[]
  deploys: PackageDeploy[]
  private finished: boolean
  private _tx: Tx
  private _executedAt: Option<moment.Moment>

  constructor(tx: Tx) {
    this.outputs = []
    this.deploys = []
    this.finished = false
    this._tx = tx
    this._executedAt = Option.none()
  }


  get tx (): Tx {
    return this._tx
  }

  addOutput(output: JigState) {
    if (this.finished) {
      throw new ExecutionError('Execution already finished')
    }
    this.outputs.push(output)
  }

  addDeploy(deploy: PackageDeploy) {
    if (this.finished) {
      throw new ExecutionError('Execution already finished')
    }
    this.deploys.push(deploy)
  }

  get executedAt(): number {
    return this._executedAt
      .map(aMoment => aMoment.unix())
      .orElse(() => { throw new Error('todo mal') })
  }

  finish(clock: Clock) {
    this.finished = true
    this._executedAt = Option.some(clock.now())
  }
}
