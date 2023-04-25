import {JigState} from '../jig-state.js';
import {Address, base16, Pointer} from "@aldea/sdk-js";
import {ExecutionResult} from "../execution-result.js";
import {LockType, WasmInstance} from "../wasm-instance.js";
import {Option} from "../support/option.js";
import {PkgRepository, StateProvider} from "../state-interfaces.js";
import {PkgData} from "../pkg-data.js";
import {DataSave, HistoricalRecord} from "./interfaces.js";

export class MemoryStorage implements StateProvider, PkgRepository, DataSave, HistoricalRecord {
  private utxosByOid: Map<string, JigState> // output_id -> state. Only utxos
  private utxosByAddress: Map<string, JigState[]> // address -> state. Only utxos
  private tips: Map<string, string> // origin -> latest output_id
  private origins: Map<string, string> // utxo -> origin. Only utxos
  private transactions: Map<string, ExecutionResult> // txId -> transaction execution.
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
    txExecution.deploys.forEach(pkgDeploy => this.addPackage(PkgData.fromPackageDeploy(pkgDeploy)))
  }

  addUtxo(jigState: JigState) {
    const currentLocation = base16.encode(jigState.id());
    const originStr = jigState.origin.toString();

    if (!jigState.isNew()) {
      const prevLocation = this.tips.get(originStr)

      // if it's not new but there is not prev location that means that is a local client. It's fine.
      if (prevLocation) {
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

  tipFor(origin: Pointer): Uint8Array {
    const tip = this.tips.get(origin.toString());
    if (!tip) throw new Error('not found')
    return base16.decode(tip)
  }

  addTransaction(exec: ExecutionResult): void {
    this.transactions.set(exec.tx.id, exec)
  }

  getTransaction(txId: string): ExecutionResult | undefined {
    return this.transactions.get(txId)
  }

  addPackage(pkgData: PkgData): void {
    this.packages.set(base16.encode(pkgData.id), pkgData)
  }

  getHistoricalUtxo(outputId: Uint8Array, onNotFound: () => JigState): JigState {
    const state = this.historicalUtxos.get(base16.encode(outputId))
    if (!state) return onNotFound()
    return state
  }

  utxosForAddress(userAddr: Address): JigState[] {
    return Option.fromNullable(this.utxosByAddress.get(userAddr.toString()))
      .orDefault([])
  }


  //
  // StateProvider methods
  //

  stateByOutputId(outputId: Uint8Array): Option<JigState> {
    const state = this.utxosByOid.get(base16.encode(outputId))
    return Option.fromNullable(state)
  }

  stateByOrigin(origin: Pointer): Option<JigState> {
    const latestLocation = this.tips.get(origin.toString())
    if (!latestLocation) return Option.none()
    const ret = this.utxosByOid.get(latestLocation)
    return Option.fromNullable(ret)
  }

  //
  // PkgRepository methods
  //
  wasmForPackageId(moduleId: Uint8Array): WasmInstance {
    let mod = this.getRawPackage(moduleId).get()
    return new WasmInstance(mod.mod, mod.abi, mod.id);
  }

  getRawPackage (id: Uint8Array): Option<PkgData> {
    const idHex = base16.encode(id)
    const pkg =  this.packages.get(idHex)
    return Option.fromNullable(pkg)
  }

}
