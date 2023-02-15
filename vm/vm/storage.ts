import {JigState} from './jig-state.js';
import {Abi} from "@aldea/compiler/abi";
import {base16, Pointer} from "@aldea/sdk-js";
import {ExecutionResult} from "./execution-result.js";

export type ModuleData = {
  mod: WebAssembly.Module,
  abi: Abi,
  wasmBin: Uint8Array,
  entries: string[],
  sources: Map<string, string>
}

type OnNotFound = (pkgId: string) => ModuleData

const throwNotFound = (idHex: string) => { throw new Error(`unknown module: ${idHex}`) }

export class Storage {
  private statesPerLocation: Map<string, JigState>;
  private tips: Map<string, string>;
  private origins: Map<string, string>;
  private transactions: Map<string, ExecutionResult>;
  private modules: Map<string, ModuleData>

  constructor() {
    this.statesPerLocation = new Map()
    this.tips = new Map()
    this.origins = new Map()
    this.transactions = new Map()
    this.modules = new Map()
  }

  persist(txExecution: ExecutionResult) {
    this.addTransaction(txExecution)
    txExecution.outputs.forEach((state: JigState) => this.addJig(state))
  }

  addJig(jigState: JigState) {
    const currentLocation = base16.encode(jigState.id());
    this.statesPerLocation.set(currentLocation, jigState)
    this.tips.set(jigState.origin.toString(), currentLocation)
    this.origins.set(currentLocation, jigState.origin.toString())
  }

  getJigStateByOrigin(origin: Pointer, onNotFound: () => JigState): JigState {
    const latestLocation = this.tips.get(origin.toString())
    if (!latestLocation) return onNotFound()
    const ret = this.statesPerLocation.get(latestLocation)
    if (!ret) return onNotFound()
    return ret
  }

  getJigStateByOutputId (outputId: Uint8Array, onNotFound: () => JigState): JigState {
    const state = this.statesPerLocation.get(base16.encode(outputId))
    if (!state) return onNotFound()
    return state
  }

  tipFor(origin: Pointer): Uint8Array {
    const tip = this.tips.get(origin.toString());
    if (!tip) throw new Error('not found')
    return base16.decode(tip)
  }

  addTransaction(exec: ExecutionResult) {
    this.transactions.set(exec.tx.id, exec)
  }

  getTransaction(txid: string) {
    return this.transactions.get(txid)
  }

  addPackage(id: Uint8Array, module: WebAssembly.Module, abi: Abi, sources: Map<string, string>, entries: string[], wasmBin: Uint8Array): void {
    this.modules.set(base16.encode(id), { mod: module, abi, wasmBin, entries, sources })
  }

  getModule (id: Uint8Array, onNotFound: OnNotFound = throwNotFound): ModuleData {
    const idHex = base16.encode(id)
    const module =  this.modules.get(idHex)
    if (!module) {
      return onNotFound(idHex)
    }
    return module
  }

  hasModule(id: Uint8Array): boolean {
    return this.modules.has(base16.encode(id));
  }

  tipForOrigin(ref: Uint8Array): string {
    const refHex = base16.encode(ref)
    const origin = this.origins.get(refHex)
    if (!origin) {
      throw new Error('error')
    }
    const tip = this.tips.get(origin);
    if (!tip) {
      throw new Error('is not present')
    }
    return tip
  }
}
