import {PackageDeploy} from "./execution-result.js";
import { Abi } from '@aldea/compiler/abi'
export class PkgData {
  abi: Abi
  docs: Uint8Array
  entries: string[]
  id: Uint8Array
  mod: WebAssembly.Module
  sources: Map<string, string>
  wasmBin: Uint8Array

  constructor(
    abi: Abi,
    docs: Uint8Array,
    entries: string[],
    id: Uint8Array,
    mod: WebAssembly.Module,
    sources: Map<string, string>,
    wasmBin: Uint8Array
  ) {
    this.abi = abi
    this.docs = docs
    this.entries = entries
    this.id = id
    this.mod = mod
    this.sources = sources
    this.wasmBin = wasmBin
  }

  static fromPackageDeploy(deploy: PackageDeploy) {
    return new this(
      deploy.abi,
      deploy.docs,
      deploy.entries,
      deploy.hash,
      new WebAssembly.Module(deploy.bytecode),
      deploy.sources,
      deploy.bytecode
    )
  }
}
