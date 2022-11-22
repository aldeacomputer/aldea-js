import {JigState} from './jig-state.js';
import {Transaction} from "./transaction.js";
import {TxExecution} from "./tx-execution.js";
import {Abi} from "@aldea/compiler/abi";
import {Location} from "@aldea/sdk-js";

export type ModuleData = {
  mod: WebAssembly.Module,
  abi: Abi
}

export class Storage {
  private statesPerLocation: Map<string, JigState>;
  private tips: Map<string, string>;
  private origins: Map<string, string>;
  private transactions: Map<string, Transaction>;
  private modules: Map<string, ModuleData>

  constructor() {
    this.statesPerLocation = new Map()
    this.tips = new Map()
    this.origins = new Map()
    this.transactions = new Map()
    this.modules = new Map()
  }

  persist(txExecution: TxExecution) {
    this.addTransaction(txExecution.tx)
    txExecution.outputs.forEach((state: JigState) => this.addJig(state))
  }

  addJig(jigState: JigState) {
    this.statesPerLocation.set(jigState.location.toString(), jigState)
    this.tips.set(jigState.origin.toString(), jigState.location.toString())
    this.origins.set(jigState.location.toString(), jigState.origin.toString())
  }

  getJigState(location: Location): JigState {
    const origin = this.origins.get(location.toString())
    if (!origin) throw new Error('not found')
    const latestLocation = this.tips.get(origin)
    if (!latestLocation) throw new Error('not found')
    const ret = this.statesPerLocation.get(latestLocation)
    if (!ret) throw new Error('not found')
    return ret
  }

  tipFor(origin: string): string {
    const tip = this.tips.get(origin);
    if (!tip) throw new Error('not found')
    return tip
  }

  addTransaction(tx: Transaction) {
    this.transactions.set(tx.id, tx)
  }

  getTransaction(txid: string) {
    return this.transactions.get(txid)
  }

  addModule(id: string, module: WebAssembly.Module, abi: Abi): void {
    this.modules.set(id, { mod: module, abi })
  }

  getModule (id: string): ModuleData {
    const module =  this.modules.get(id)
    if (!module) {
      throw new Error(`unknown module: ${id}`)
    }
    return module
  }

  hasModule(id: string): boolean {
    return this.modules.has(id);
  }
}
