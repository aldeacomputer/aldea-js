import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"
import {PkgData, Storage} from "./storage.js";
import {abiFromCbor, abiFromJson} from '@aldea/compiler/abi'
import {compile} from '@aldea/compiler'
import {Address, Pointer, Tx} from "@aldea/sdk-js";
import {calculatePackageId} from "./calculate-package-id.js";
import {JigState} from "./jig-state.js";
import {randomBytes} from "@aldea/sdk-js/support/ed25519";
import {UserLock} from "./locks/user-lock.js";
import {Buffer} from "buffer";
import {encodeSequence} from "./cbor.js";
import {ExecutionResult} from "./execution-result.js";
import {PkgRepository} from "./state-interfaces.js";
import {Clock} from "./clock.js";
import {TxContext} from "./tx-context.js";

const __dir = fileURLToPath(import.meta.url)

// Magic Coin Pkg ID
const COIN_PKG_ID = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
])

export class VM implements PkgRepository {
  private readonly storage: Storage;
  clock: Clock;

  constructor (storage: Storage, clock: Clock) {
    this.storage = storage
    this.clock = clock
    this.addPreCompiled('aldea/coin.wasm', 'aldea/coin.ts', COIN_PKG_ID)
  }

  async execTx(tx: Tx): Promise<ExecutionResult> {
    const context = new TxContext(tx, this.storage, this, this.clock)
    const currentExecution = new TxExecution(context)
    const result = await currentExecution.run()
    this.storage.persist(result)
    return result
  }

  wasmFromPackageData (pkgData: PkgData): WasmInstance {
    return new WasmInstance(pkgData.mod, pkgData.abi, pkgData.id)
  }

  wasmForPackageId (id: Uint8Array): WasmInstance {
    const pkgData = this.storage.getModule(id)
    return this.wasmFromPackageData(pkgData)
  }

  async compileSources (entries: string[], sources: Map<string, string>): Promise<PkgData> {
    const id = calculatePackageId(entries, sources)

    const obj: {[key: string]: string} = {}
    for (const [key, value] of sources.entries()) {
      obj[key] = value
    }

    const result = await compile(entries, obj)

    return new PkgData(
      abiFromCbor(result.output.abi.buffer),
      Buffer.from(result.output.docs || ''),
      entries,
      id,
      new WebAssembly.Module(result.output.wasm),
      sources,
      result.output.wasm
    )
  }

  addPreCompiled (compiledRelative: string, sourceRelative: string, defaultId: Uint8Array | null = null): Uint8Array {
    const srcPath = path.join(__dir, '../../assembly', sourceRelative)
    const srcCode = fs.readFileSync(srcPath);
    const sources = new Map<string, string>()
    sources.set('index.ts', srcCode.toString())
    const entries = ['index.ts'];
    const id = defaultId
      ? defaultId
      : calculatePackageId(entries, sources)
    if (this.storage.hasModule(id)) {
      return id
    }

    const modulePath = path.join(__dir, '../../build', compiledRelative)
    const wasmBin = fs.readFileSync(modulePath)
    const abiPath = modulePath.replace('wasm', 'abi.json')
    const abi = abiFromJson(fs.readFileSync(abiPath).toString())
    const docsPath = modulePath.replace('wasm', 'docs.json')
    const docs = fs.readFileSync(docsPath);

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
    if (!locBuf) locBuf = randomBytes(32)

    const location = new Pointer(locBuf, 0);
    const minted = new JigState(
      location,
      location,
      0,
      encodeSequence([amount]),
      COIN_PKG_ID,
      new UserLock(address),
      this.clock.now().unix()
    )
    this.storage.addUtxo(minted)
    return minted
  }
}
