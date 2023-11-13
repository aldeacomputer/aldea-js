import {PkgData, Storage} from "./storage.js";
import {CompilerResult, PackageParser, writeDependency} from '@aldea/compiler'
import {Address, BCS, Pointer, abiFromBin, util, Output} from "@aldea/core";
import {calculatePackageId} from "./calculate-package-id.js";
import {Buffer} from "buffer";
import {Clock} from "./clock.js";
import {data as wasm} from './builtins/coin.wasm.js'
import {data as rawAbi} from './builtins/coin.abi.bin.js'
import {data as rawDocs} from './builtins/coin.docs.json.js'
import {data as rawSource} from './builtins/coin.source.js'
import {AddressLock} from "./locks/address-lock.js";

// Magic Coin Pkg ID
const COIN_PKG_ID = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
])

export type CompileFn = (entry: string[], src: Map<string, string>, deps: Map<string, string>) => Promise<CompilerResult>;

export class VM {
  private readonly storage: Storage;
  clock: Clock;
  private compile: CompileFn;

  constructor (storage: Storage, clock: Clock, compile: CompileFn) {
    this.storage = storage
    this.clock = clock
    this.compile = compile
    this.addPreCompiled(wasm, rawSource, rawAbi, rawDocs, COIN_PKG_ID)
  }

  // async execTx(tx: Tx): Promise<ExecutionResult> {
  //   const context = new StorageTxContext(tx, this.storage, this, this.clock)
  //   const currentExecution = new TxExecution(context)
  //   const result = await currentExecution.run()
  //   this.storage.persist(result)
  //   return result
  // }

  // async execTxFromInputs(exTx: ExtendedTx) {
  //   const context = new ExTxExecContext(exTx, this.clock, this.pkgs, this)
  //   const currentExecution = new TxExecution(context)
  //   const result = await currentExecution.run()
  //   this.storage.persist(result)
  //   return result
  // }

  async compileSources (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    const id = calculatePackageId(entries, sources)

    const pkg = await PackageParser.create(entries, {
      getSrc: (src) => sources.get(src),
      getDep: (pkgId) => {
        const { abi } = this.storage.getModule(pkgId)
        return writeDependency(abi)
      }, 
    })

    const result = await this.compile(pkg.entries, pkg.code, pkg.deps)

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

  mint (address: Address, amount: number = 1e6, locBuf?: Uint8Array): Output {
    const location = locBuf
      ? new Pointer(locBuf, 0)
      : new Pointer(util.randomBytes(32), 0);
    const bcs = new BCS({})
    const minted = new Output(
      location,
      location,
      new Pointer(COIN_PKG_ID, 0),
      new AddressLock(address).coreLock(),
      bcs.encode('u64', amount)
    )
    this.storage.addUtxo(minted)
    return minted
  }
}
