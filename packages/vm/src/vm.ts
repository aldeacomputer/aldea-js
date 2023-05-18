import {TxExecution} from './tx-execution.js'
import {PkgData, Storage} from "./storage.js";
import {CompilerResult} from '@aldea/compiler'
import {Address, BCS, Pointer, Tx, abiFromBin, util} from "@aldea/core";
import {calculatePackageId} from "./calculate-package-id.js";
import {JigState} from "./jig-state.js";
import {Buffer} from "buffer";
import {ExecutionResult} from "./execution-result.js";
import {Clock} from "./clock.js";
import {StorageTxContext} from "./tx-context/storage-tx-context.js";
import {ExtendedTx} from "./tx-context/extended-tx.js";
import {ExTxExecContext} from "./tx-context/ex-tx-exec-context.js";
import {data as wasm} from './builtins/coin.wasm.js'
import {data as rawAbi} from './builtins/coin.abi.bin.js'
import {data as rawDocs} from './builtins/coin.docs.json.js'
import {data as rawSource} from './builtins/coin.source.js'
import {PkgRepository} from "./state-interfaces.js";
import {SerializedLock} from "./locks/serialized-lock.js";
import {LockType} from "./wasm-instance.js";

// Magic Coin Pkg ID
const COIN_PKG_ID = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
])

export type CompileFn = (entry: string[], src: Map<string, string>) => Promise<CompilerResult>;

export class VM {
  private readonly storage: Storage;
  clock: Clock;
  private compile: CompileFn;
  private pkgs: PkgRepository;

  constructor (storage: Storage, pkgs: PkgRepository, clock: Clock, compile: CompileFn) {
    this.storage = storage
    this.clock = clock
    this.pkgs = pkgs
    this.compile = compile
    this.addPreCompiled(wasm, rawSource, rawAbi, rawDocs, COIN_PKG_ID)
  }

  async execTx(tx: Tx): Promise<ExecutionResult> {
    const context = new StorageTxContext(tx, this.storage, this, this.clock)
    const currentExecution = new TxExecution(context)
    const result = await currentExecution.run()
    this.storage.persist(result)
    return result
  }

  async execTxFromInputs(exTx: ExtendedTx) {
    const context = new ExTxExecContext(exTx, this.clock, this.pkgs, this)
    const currentExecution = new TxExecution(context)
    const result = await currentExecution.run()
    this.storage.persist(result)
    return result
  }

  async compileSources (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    const id = calculatePackageId(entries, sources)
    const result = await this.compile(entries, sources)

    return new PkgData(
      abiFromBin(result.output.abi),
      Buffer.from(result.output.docs || ''),
      entries,
      id,
      new WebAssembly.Module(result.output.wasm),
      sources,
      result.output.wasm
    )
  }

  addPreCompiled (wasmBin: Uint8Array, sourceStr: string, abiBin: Uint8Array, docs: Uint8Array, defaultId: Uint8Array | null = null): Uint8Array {

    const sources = new Map<string, string>()
    sources.set('index.ts',sourceStr.toString())
    const entries = ['index.ts'];
    const id = defaultId
      ? defaultId
      : calculatePackageId(entries, sources)
    if (this.storage.hasModule(id)) {
      return id
    }

    const abi = abiFromBin(abiBin)

    this.storage.addPackage(id, new PkgData(
      abi,
      docs,
      entries,
      id,
      new WebAssembly.Module(wasmBin),
      sources,
      wasmBin
    ))
    return id
  }

  mint (address: Address, amount: number = 1e6, locBuf?: Uint8Array): JigState {
    const location = locBuf
      ? new Pointer(locBuf, 0)
      : new Pointer(util.randomBytes(32), 0);
    const bcs = new BCS({})
    const minted = new JigState(
      location,
      location,
      0,
      bcs.encode('u64', amount),
      COIN_PKG_ID,
      new SerializedLock(LockType.PUBKEY, address.hash),
      this.clock.now().unix()
    )
    this.storage.addUtxo(minted)
    return minted
  }
}
