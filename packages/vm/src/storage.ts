import {JigState} from './jig-state.js';
import {Abi} from "@aldea/compiler/abi";
import {Address, base16, Pointer} from "@aldea/sdk-js";
import {ExecutionResult, PackageDeploy} from "./execution-result.js";
import {LockType, WasmInstance} from "./wasm-instance.js";
import {Option} from "./support/option.js";
import {PkgRepository, StateProvider} from "./state-interfaces.js";

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

export class Storage implements StateProvider, PkgRepository {
  private utxosByOid: Map<string, JigState> // output_id -> state. Only utxos
  private utxosByAddress: Map<string, JigState[]> // address -> state. Only utxos
  private tips: Map<string, string> // origin -> latest output_id
  private origins: Map<string, string> // utxo -> origin. Only utxos
  private transactions: Map<string, ExecutionResult> // txid -> transaction execution.
  private packages: Map<string, PkgData> // pkg_id -> pkg data
  private historicalUtxos: Map<string, JigState>

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
    txExecution.outputs.forEach((state: JigState) => this.addUtxo(state))
    txExecution.deploys.forEach(pkgDeploy => this.addPackage(pkgDeploy.hash, PkgData.fromPackageDeploy(pkgDeploy)))
  }

  addUtxo(jigState: JigState) {
    const currentLocation = base16.encode(jigState.id());
    const originStr = jigState.origin.toString();

    if (!jigState.isNew()) {
      const prevLocation = this.tips.get(originStr)
      if (!prevLocation) {
        throw new Error(`${originStr} should exist`)
      }
      const oldState = this.utxosByOid.get(prevLocation)
      this.utxosByOid.delete(prevLocation)
      this.tips.delete(originStr)
      this.origins.delete(originStr)
      if (oldState) {
        oldState.address().ifPresent((addr) => {
          const list = this.utxosByAddress.get(addr.toString())
          if (!list) {
            throw new Error('error')
          }
          const filtered = list.filter(s => !s.origin.equals(oldState.origin))
          this.utxosByAddress.set(addr.toString(), filtered)
        })
      }
      if (jigState.lockType() === LockType.PUBKEY) {
      }
    }

    this.utxosByOid.set(currentLocation, jigState)
    this.historicalUtxos.set(currentLocation, jigState)
    this.tips.set(originStr, currentLocation)
    this.origins.set(currentLocation, originStr)
    if (jigState.lockType() === LockType.PUBKEY) {
      const address = jigState.address().map(a => a.toString()).get();
      const previous = this.utxosByAddress.get(address)
      if (previous) {
        previous.push(jigState)
      } else {
        this.utxosByAddress.set(address, [jigState])
      }
    }
  }

  getJigStateByOrigin(origin: Pointer): Option<JigState> {
    const latestLocation = this.tips.get(origin.toString())
    if (!latestLocation) return Option.none()
    const ret = this.utxosByOid.get(latestLocation)
    return Option.fromNullable(ret)
  }

  getJigStateByOutputId (outputId: Uint8Array): Option<JigState> {
    const state = this.utxosByOid.get(base16.encode(outputId))
    return Option.fromNullable(state)
  }

  tipFor(origin: Pointer): Uint8Array {
    const tip = this.tips.get(origin.toString());
    if (!tip) throw new Error('not found')
    return base16.decode(tip)
  }

  addTransaction(exec: ExecutionResult): void {
    this.transactions.set(exec.tx.id, exec)
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

  getHistoricalUtxo (outputId: Uint8Array, onNotFound: () => JigState): JigState {
    const state = this.historicalUtxos.get(base16.encode(outputId))
    if (!state) return onNotFound()
    return state
  }

  utxosForAddress(userAddr: Address): JigState[] {
    return Option.fromNullable(this.utxosByAddress.get(userAddr.toString()))
      .orDefault([])
  }

  byOutputId(id: Uint8Array): Option<JigState> {
    return this.getJigStateByOutputId(id);
  }

  byOrigin(origin: Pointer): Option<JigState> {
    return this.getJigStateByOrigin(origin);
  }

  wasmForPackageId(moduleId: Uint8Array): WasmInstance {
    let mod = this.getModule(moduleId)
    return new WasmInstance(mod.mod, mod.abi, mod.id);
  }
}
