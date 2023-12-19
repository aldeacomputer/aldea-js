import moment from "moment";
import {base16, Output} from "@aldea/core";
import {Abi} from "@aldea/core/abi";
import {ExecutionError} from "./errors.js";
import {calculatePackageHash} from "./calculate-package-hash.js";
import {Option} from "./support/option.js";

import {PkgData} from "./storage/pkg-data.js";

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
    return calculatePackageHash(this.entries, this.sources)
  }

  get id (): string {
    return base16.encode(this.hash)
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
  spends: Output[]
  reads: Output[]
  deploys: PackageDeploy[]
  private finished: boolean
  txId: string
  hydrosUsed: number

  constructor(txId: string) {
    this.outputs = []
    this.deploys = []
    this.spends = []
    this.reads = []
    this.finished = false
    this.txId = txId
    this.hydrosUsed = 0
  }

  addOutput(output: Output) {
    if (this.finished) {
      throw new ExecutionError('Execution already finished')
    }
    this.outputs.push(output)
  }

  addSpend(output: Output) {
    this.spends.push(output)
  }

  addDeploy(deploy: PackageDeploy) {
    if (this.finished) {
      throw new ExecutionError('Execution already finished')
    }
    this.deploys.push(deploy)
  }

  setHydrosUsed(hydros: number) {
    this.hydrosUsed = hydros
  }

  finish() {
    this.finished = true
  }

  addRead (output: Output) {
    this.reads.push(output)
  }
}
