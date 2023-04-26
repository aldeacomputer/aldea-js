import {JigState} from "./jig-state.js";
import {Abi} from "@aldea/compiler/abi";
import {ExecutionError} from "./errors.js";
import {Output, Tx} from "@aldea/sdk-js";
import {calculatePackageId} from "./calculate-package-id.js";
import moment from "moment";
import {Option} from "./support/option.js";
import {PkgData} from "./pkg-data.js";

export class PackageDeploy {
  sources: Map<string, string>
  entries: string[]
  bytecode: Uint8Array
  abi: Abi
  docs: Uint8Array

  constructor(sources: Map<string, string>, entries: string[], bytecode: Uint8Array, abi: Abi, docs: Uint8Array) {
    this.sources = sources
    this.entries = entries
    this.bytecode = bytecode
    this.abi = abi
    this.docs = docs
  }

  get hash (): Uint8Array {
    return calculatePackageId(this.entries, this.sources)
  }

  static fromPackageDate(pkgData: PkgData): PackageDeploy {
      return new this(
        pkgData.sources,
        pkgData.entries,
        pkgData.wasmBin,
        pkgData.abi,
        pkgData.docs
      );
  }
}

export class ExecutionResult {
  outputs: Output[]
  inputs: Output[]
  deploys: PackageDeploy[]
  private finished: boolean
  private _tx: Tx
  private _executedAt: Option<moment.Moment>

  constructor(tx: Tx) {
    this.outputs = []
    this.deploys = []
    this.inputs = []
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
    this.outputs.push(output.toOutput())
  }

  addInputs(output: Output[]) {
    this.inputs.push(...output)
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

  finish(time: moment.Moment) {
    this.finished = true
    this._executedAt = Option.some(time)
  }
}
