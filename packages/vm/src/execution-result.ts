import moment from "moment";
import {Output, Tx} from "@aldea/core";
import {Abi} from "@aldea/core/abi";
import {ExecutionError} from "./errors.js";
import {calculatePackageId} from "./calculate-package-id.js";
import {Option} from "./support/option.js";
import {PkgData} from "./storage.js";

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
  txId: string
  private _executedAt: Option<moment.Moment>

  constructor(txId: string) {
    this.outputs = []
    this.deploys = []
    this.inputs = []
    this.finished = false
    this.txId = txId
    this._executedAt = Option.none()
  }

  addOutput(output: Output) {
    if (this.finished) {
      throw new ExecutionError('Execution already finished')
    }
    this.outputs.push(output)
  }

  addInput(output: Output) {
    this.inputs.push(output)
  }

  addDeploy(deploy: PackageDeploy) {
    if (this.finished) {
      throw new ExecutionError('Execution already finished')
    }
    this.deploys.push(deploy)
  }

  finish(time: moment.Moment) {
    this.finished = true
    this._executedAt = Option.some(time)
  }
}
