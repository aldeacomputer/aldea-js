import {Address, base16, LockType, Output, Pointer, Tx} from "@aldea/core";
import {ExecutionResult} from "../execution-result.js";
import {WasmContainer} from "../wasm-container.js";
import {Option} from "../support/option.js";
import {Storage} from "./generic-storage.js";
import {PkgData} from "./pkg-data.js";

export class MemStorage implements Storage {
  private utxosByOutputId: Map<string, Output> // output_id -> state. Only utxos
  private utxosByAddress: Map<string, Output[]> // address -> state. Only utxos
  private utxosByLock: Map<string, Output[]> // address -> state. Only utxos
  private tips: Map<string, string> // origin -> latest output_id
  private txs: Map<string, Tx>
  private execResults: Map<string, ExecutionResult> // txid -> transaction execution.
  private packages: Map<string, PkgData> // pkg_id -> pkg data
  private historicalUtxos: Map<string, Output>

  constructor() {
    this.utxosByOutputId = new Map()
    this.tips = new Map()
    this.txs = new Map()
    this.execResults = new Map()
    this.packages = new Map()
    this.historicalUtxos = new Map()
    this.utxosByAddress = new Map()
    this.utxosByLock = new Map()
  }


  /**
   * Persists a transaction.
   *
   * @param {Tx} tx - The transaction to persist.
   *
   * @return {void}
   */
  async persistTx (tx: Tx): Promise<void> {
    this.txs.set(tx.id, tx)
  }

  async persistExecResult (txExecution: ExecutionResult): Promise<void> {
    this.execResults.set(txExecution.txId, txExecution)
    await Promise.all(txExecution.outputs.map((state) => this.addUtxo(state)))
    txExecution.deploys.forEach(pkgDeploy => this.addPackage(pkgDeploy.hash, PkgData.fromPackageDeploy(pkgDeploy)))
  }

  async addUtxo (output: Output): Promise<void> {
    const currentOutputId = output.id;
    const originStr = output.origin.toString();
    const origin = Pointer.fromString(originStr)

    const prevOutput = this.tipFor(origin)

    prevOutput.ifPresent((prevOutputId) => {
      const prevOutput = this.outputById(prevOutputId).get()
      this.utxosByOutputId.delete(prevOutputId)

      if (prevOutput.lock.type === LockType.ADDRESS) {
        const address = new Address(prevOutput.lock.data);
        const previousByAddr = this.utxosForAddress(address)
          .filter(o => o.id !== prevOutputId)
        this.utxosByAddress.set(address.toString(), previousByAddr)
      }
      const serializedLock = prevOutput.lock.toHex();
      const previousByLock = this.utxosForLock(serializedLock)
        .filter(o => o.id !== prevOutputId)
      this.utxosByAddress.set(serializedLock, previousByLock)
    })

    if (output.lock.type !== LockType.FROZEN) {
      this.utxosByOutputId.set(currentOutputId, output)
    }

    if (output.lock.type === LockType.ADDRESS) {
      const address = new Address(output.lock.data);
      const previousByAddr = this.utxosForAddress(address)
      previousByAddr.push(output)
      this.utxosByAddress.set(address.toString(), previousByAddr)
    }

    const serializedLock = output.lock.toHex();
    const previousByLock = this.utxosForLock(serializedLock)
    previousByLock.push(output)
    this.utxosByAddress.set(serializedLock, previousByLock)

    this.tips.set(originStr, currentOutputId)
    this.historicalUtxos.set(currentOutputId, output)
  }

  /**
   * Retrieves the output id of the tip of the jig with the given origin.
   *
   * @param {Pointer} origin - The origin to retrieve the tip for.
   * @returns {Option<string>} - An option containing the tip if found, otherwise None.
   */
  tipFor (origin: Pointer): Option<string> {
    const tip = this.tips.get(origin.toString());
    return Option.fromNullable(tip)
  }

  getTx (txid: string): Option<Tx> {
    return Option.fromNullable(this.txs.get(txid))
  }

  getExecResult (txid: string): Option<ExecutionResult> {
    return Option.fromNullable(this.execResults.get(txid))
  }

  addPackage (id: Uint8Array, pkgData: PkgData): void {
    this.packages.set(base16.encode(id), pkgData)
  }

  getPkg (id: string): Option<PkgData> {
    const pkg = this.packages.get(id)
    return Option.fromNullable(pkg)
  }

  getHistoricalUtxo (outputId: Uint8Array): Option<Output> {
    const state = this.historicalUtxos.get(base16.encode(outputId))
    return Option.fromNullable(state)
  }

  utxosForAddress (userAddr: Address): Output[] {
    return Option.fromNullable(this.utxosByAddress.get(userAddr.toString()))
      .orDefault([])
  }

  utxosForLock (lockHex: string): Output[] {
    return Option.fromNullable(this.utxosByLock.get(lockHex))
      .orDefault([])
  }

  outputByHash (hash: Uint8Array): Option<Output> {
    const id = base16.encode(hash)
    return this.outputById(id)
  }

  outputById (id: string): Option<Output> {
    const state = this.utxosByOutputId.get(id)
    return Option.fromNullable(state)
  }

  outputByOrigin (origin: Pointer): Option<Output> {
    const latestLocation = this.tips.get(origin.toString())
    if (!latestLocation) return Option.none()
    const ret = this.utxosByOutputId.get(latestLocation)
    return Option.fromNullable(ret)
  }

  wasmForPackageId (moduleId: string): Option<WasmContainer> {
    return this.getPkg(moduleId).map(pkg => {
      return new WasmContainer(pkg.mod, pkg.abi, pkg.id);
    })
  }
}
