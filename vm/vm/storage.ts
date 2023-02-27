import {JigState} from './jig-state.js';
import {Abi} from "@aldea/compiler/abi";
import {base16, Pointer} from "@aldea/sdk-js";
import {ExecutionResult} from "./execution-result.js";

export type ModuleData = {
  mod: WebAssembly.Module,
  abi: Abi,
  wasmBin: Uint8Array,
  entries: string[],
  sources: Map<string, string>,
  docs: Uint8Array
}

type OnNotFound = (pkgId: string) => ModuleData

const throwNotFound = (idHex: string) => { throw new Error(`unknown module: ${idHex}`) }

export class Storage {
  private utxos: Map<string, JigState> // output_id -> state. Only utxos
  private tips: Map<string, string> // orgin -> latest output_id
  private origins: Map<string, string> // utxo -> origin. Only utxos
  private transactions: Map<string, ExecutionResult> // txid -> transaction execution.
  private packages: Map<string, ModuleData> // pkg_id -> pkg data
  private historicalUtxos: Map<string, JigState>

  constructor() {
    this.utxos = new Map()
    this.tips = new Map()
    this.origins = new Map()
    this.transactions = new Map()
    this.packages = new Map()
    this.historicalUtxos = new Map()
  }

  persist(txExecution: ExecutionResult) {
    this.addTransaction(txExecution)
    txExecution.outputs.forEach((state: JigState) => this.addUtxo(state))
  }

  addUtxo(jigState: JigState) {
    const currentLocation = base16.encode(jigState.id());
    const originStr = jigState.origin.toString();

    if (!jigState.isNew()) {
      const prevLocation = this.tips.get(originStr)
      if (!prevLocation) {
        throw new Error(`${originStr} should exist`)
      }
      this.utxos.delete(prevLocation)
      this.tips.delete(originStr)
      this.origins.delete(originStr)
    }

    this.utxos.set(currentLocation, jigState)
    this.historicalUtxos.set(currentLocation, jigState)
    this.tips.set(originStr, currentLocation)
    this.origins.set(currentLocation, originStr)
  }

  getJigStateByOrigin(origin: Pointer, onNotFound: () => JigState): JigState {
    const latestLocation = this.tips.get(origin.toString())
    if (!latestLocation) return onNotFound()
    const ret = this.utxos.get(latestLocation)
    if (!ret) return onNotFound()
    return ret
  }

  getJigStateByOutputId (outputId: Uint8Array, onNotFound: () => JigState): JigState {
    const state = this.utxos.get(base16.encode(outputId))
    if (!state) return onNotFound()
    return state
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

  addPackage(id: Uint8Array, module: WebAssembly.Module, abi: Abi, sources: Map<string, string>, entries: string[], wasmBin: Uint8Array, docs: Uint8Array): void {
    this.packages.set(base16.encode(id), { mod: module, abi, wasmBin, entries, sources, docs})
  }

  getModule (id: Uint8Array, onNotFound: OnNotFound = throwNotFound): ModuleData {
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
}
