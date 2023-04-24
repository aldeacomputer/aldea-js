import {TxExecution} from './tx-execution.js'
import {DataSave, PkgData} from "./storage.js";
import {abiFromCbor} from '@aldea/compiler/abi'
import {Address, Pointer, Tx} from "@aldea/sdk-js";
import {calculatePackageId} from "./calculate-package-id.js";
import {JigState} from "./jig-state.js";
import {util} from "@aldea/sdk-js";
import {encodeSequence} from "./cbor.js";
import {ExecutionResult} from "./execution-result.js";
import {Clock} from "./clock.js";
import {StorageTxContext} from "./tx-context/storage-tx-context.js";
import {ExtendedTx} from "./tx-context/extended-tx.js";
import {ExTxExecContext} from "./tx-context/ex-tx-exec-context.js";
import {data as wasm} from './builtins/coin.wasm.js'
import {data as rawAbi} from './builtins/coin.abi.cbor.js'
import {data as rawDocs} from './builtins/coin.docs.json.js'
import {data as rawSource} from './builtins/coin.source.js'
import {PkgRepository, StateProvider} from "./state-interfaces.js";
import {SerializedLock} from "./locks/serialized-lock.js";
import {LockType} from "./wasm-instance.js";
import {Compiler} from "./compiler.js";

// Magic Coin Pkg ID
const COIN_PKG_ID = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
])


export class VM {
  private readonly storage: DataSave;
  clock: Clock;
  compiler: Compiler;
  private pkgs: PkgRepository;
  private states: StateProvider;

  constructor (states: StateProvider, pkgs: PkgRepository, storage: DataSave,  clock: Clock, compiler: Compiler) {
    this.storage = storage
    this.clock = clock
    this.pkgs = pkgs
    this.states = states
    this.compiler = compiler
    this.addPreCompiled(wasm, rawSource, rawAbi, rawDocs, COIN_PKG_ID)
  }

  async execTx(tx: Tx): Promise<ExecutionResult> {
    const context = new StorageTxContext(tx, this.states, this.pkgs, this.compiler, this.clock)
    const currentExecution = new TxExecution(context)
    const result = await currentExecution.run()
    this.storage.persist(result)
    return result
  }

  async execTxFromInputs(exTx: ExtendedTx) {
    const context = new ExTxExecContext(exTx, this.clock, this.pkgs, this.compiler)
    const currentExecution = new TxExecution(context)
    const result = await currentExecution.run()
    this.storage.persist(result)
    return result
  }

  addPreCompiled (wasmBin: Uint8Array, sourceStr: string, abiBin: Uint8Array, docs: Uint8Array, defaultId: Uint8Array | null = null): Uint8Array {
    const sources = new Map<string, string>()
    sources.set('index.ts',sourceStr.toString())
    const entries = ['index.ts'];
    const id = defaultId
      ? defaultId
      : calculatePackageId(entries, sources)
    if (this.pkgs.getRawPackage(id).isFull()) {
      return id
    }

    const abi = abiFromCbor(abiBin.buffer)

    this.storage.addPackage(new PkgData(
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
    const minted = new JigState(
      location,
      location,
      0,
      encodeSequence([amount]),
      COIN_PKG_ID,
      new SerializedLock(LockType.PUBKEY, address.hash),
      this.clock.now().unix()
    )
    this.storage.addUtxo(minted)
    return minted
  }
}
