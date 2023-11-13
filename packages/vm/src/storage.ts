import {Address, base16, LockType, Output, Pointer} from "@aldea/core";
import {Abi} from "@aldea/core/abi";
import {ExecutionResult, PackageDeploy} from "./execution-result.js";
import {WasmContainer} from "./wasm-container.js";
import {Option} from "./support/option.js";

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

type OnNotFound = (pkgId: string) => PkgData

const throwNotFound = (idHex: string) => { throw new Error(`unknown module: ${idHex}`) }

export class Storage {
  private utxosByOid: Map<string, Output> // output_id -> state. Only utxos
  private utxosByAddress: Map<string, Output[]> // address -> state. Only utxos
  private tips: Map<string, string> // origin -> latest output_id
  private origins: Map<string, string> // utxo -> origin. Only utxos
  private transactions: Map<string, ExecutionResult> // txid -> transaction execution.
  private packages: Map<string, PkgData> // pkg_id -> pkg data
  private historicalUtxos: Map<string, Output>

  constructor() {
    this.utxosByOid = new Map()
    this.tips = new Map()
    this.origins = new Map()
    this.transactions = new Map()
    this.packages = new Map()
    this.historicalUtxos = new Map()
    this.utxosByAddress = new Map()
  }

  persist(txExecution: ExecutionResult) {
    this.addTransaction(txExecution)
    txExecution.outputs.forEach((state) => this.addUtxo(state))
    txExecution.deploys.forEach(pkgDeploy => this.addPackage(pkgDeploy.hash, PkgData.fromPackageDeploy(pkgDeploy)))
  }

  private isNew(o: Output): boolean {
    return o.origin.equals(o.location)
  }

  private addressFor(o: Output): Option<Address> {
    return Option.some(o)
        .filter(o => o.lock.type === LockType.ADDRESS)
        .map(o => new Address(o.lock.data))
  }

  addUtxo(output: Output) {
    const currentLocation = output.id;
    const originStr = output.origin.toString();

    if (!this.isNew(output)) {
      const prevLocation = this.tips.get(originStr)

      // if it's not new but there is not prev location that means that is a local client. It's fine.
      if (prevLocation) {
        const oldOutput = this.utxosByOid.get(prevLocation)
        this.utxosByOid.delete(prevLocation)
        this.tips.delete(originStr)
        this.origins.delete(originStr)
        if (oldOutput) {
          this.addressFor(oldOutput).ifPresent((addr) => {
            const list = this.utxosByAddress.get(addr.toString())
            if (!list) {
              throw new Error('error')
            }
            const filtered = list.filter(s => !s.origin.equals(oldOutput.origin))
            this.utxosByAddress.set(addr.toString(), filtered)
          })
        }
      }
    }

    this.utxosByOid.set(currentLocation, output)
    this.historicalUtxos.set(currentLocation, output)
    this.tips.set(originStr, currentLocation)
    this.origins.set(currentLocation, originStr)
    if (output.lock.type === LockType.ADDRESS) {
      const address = this.addressFor(output).map(a => a.toString()).get();
      const previous = this.utxosByAddress.get(address)
      if (previous) {
        previous.push(output)
      } else {
        this.utxosByAddress.set(address, [output])
      }
    }
  }

  getJigStateByOrigin(origin: Pointer): Option<Output> {
    const latestLocation = this.tips.get(origin.toString())
    if (!latestLocation) return Option.none()
    const ret = this.utxosByOid.get(latestLocation)
    return Option.fromNullable(ret)
  }

  getJigStateByOutputId (outputId: Uint8Array): Option<Output> {
    const state = this.utxosByOid.get(base16.encode(outputId))
    return Option.fromNullable(state)
  }

  tipFor(origin: Pointer): Uint8Array {
    const tip = this.tips.get(origin.toString());
    if (!tip) throw new Error('not found')
    return base16.decode(tip)
  }

  addTransaction(exec: ExecutionResult): void {
    this.transactions.set(exec.txId, exec)
  }

  getTransaction(txid: string): ExecutionResult | undefined {
    return this.transactions.get(txid)
  }

  addPackage(id: Uint8Array, pkgData: PkgData): void {
    this.packages.set(base16.encode(id), pkgData)
  }

  getModule (id: Uint8Array, onNotFound: OnNotFound = throwNotFound): PkgData {
    const idHex = base16.encode(id)
    const module =  this.packages.get(idHex)
    if (!module) {
      return onNotFound(idHex)
    }
    return module
  }

  hasModule(id: Uint8Array): boolean {
    return this.packages.has(base16.encode(id));
  }

  getHistoricalUtxo (outputId: Uint8Array): Option<Output> {
    const state = this.historicalUtxos.get(base16.encode(outputId))
    return Option.fromNullable(state)
  }

  utxosForAddress(userAddr: Address): Output[] {
    return Option.fromNullable(this.utxosByAddress.get(userAddr.toString()))
      .orDefault([])
  }

  byOutputId(id: Uint8Array): Option<Output> {
    return this.getJigStateByOutputId(id);
  }

  byOrigin(origin: Pointer): Option<Output> {
    return this.getJigStateByOrigin(origin);
  }

  wasmForPackageId(moduleId: Uint8Array): WasmContainer {
    let mod = this.getModule(moduleId)
    return new WasmContainer(mod.mod, mod.abi, mod.id);
  }
}
