import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"
import {Storage} from "./storage.js";
import {abiFromCbor, abiFromJson} from '@aldea/compiler/abi'
import {compile} from '@aldea/compiler'
import {Address, base16, Pointer, Tx} from "@aldea/sdk-js";
import {ExecutionError} from "./errors.js";
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
  private storage: Storage;
  clock: Clock;

  constructor (storage: Storage, clock: Clock) {
    this.storage = storage
    this.clock = clock
    this.addPreCompiled('aldea/coin.wasm', 'aldea/coin.ts', COIN_PKG_ID)
  }

  async execTx(tx: Tx): Promise<ExecutionResult> {
    const context = new TxContext(tx, this.storage)
    const currentExecution = new TxExecution(context, this)
    const result = await currentExecution.run()
    this.storage.persist(result)
    return result
  }

  wasmForPackage (moduleId: Uint8Array): WasmInstance {
    const existingModule = this.storage.getModule(moduleId)
    return new WasmInstance(existingModule.mod, existingModule.abi, moduleId)
  }


  findJigStateByOrigin (origin: Pointer) {
    return this.storage.getJigStateByOrigin(origin)
      .orElse(() => {
        throw new ExecutionError(`unknown jig: ${origin.toString()}`)
      })
  }

  findJigStateByOutputId (outputId: Uint8Array) {
    const jigState = this.storage.getJigStateByOutputId(outputId).orElse(() => {
      throw new ExecutionError(`jig not present in utxo set: ${base16.encode(outputId)}`)
    });
    const lastRef = this.storage.tipFor(jigState.origin)
    if (!Buffer.from(jigState.id()).equals(Buffer.from(lastRef))) {
      throw new ExecutionError(`jig already spent: ${base16.encode(outputId)}`)
    }
    return jigState
  }

  async deployCode (entries: string[], sources: Map<string, string>): Promise<Uint8Array> {
    const id = calculatePackageId(entries, sources)

    if (this.storage.hasModule(id)) {
      return id
    }

    const obj: {[key: string]: string} = {}
    for (const [key, value] of sources.entries()) {
      obj[key] = value
    }

    const result = await compile(entries, obj)
    this.storage.addPackage(
      id,
      new WebAssembly.Module(result.output.wasm),
      abiFromCbor(result.output.abi.buffer),
      sources,
      entries,
      result.output.wasm,
      Buffer.from(result.output['docs.json'])
    )
    return id
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
    const wasmBuffer = fs.readFileSync(modulePath)
    const module = new WebAssembly.Module(wasmBuffer)
    const abiPath = modulePath.replace('wasm', 'abi.json')
    const abi = abiFromJson(fs.readFileSync(abiPath).toString())
    const docsPath = modulePath.replace('wasm', 'docs.json')
    const docs = fs.readFileSync(docsPath);
    this.storage.addPackage(
      id,
      module,
      abi,
      sources,
      entries,
      new Uint8Array(wasmBuffer),
      docs
    )
    return id
  }

  mint (address: Address, amount: number = 1e6): JigState {
    const buff = randomBytes(32)

    const location = new Pointer(buff, 0);
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

  getModule(pkgId: Uint8Array) {
    return this.storage.getModule(pkgId)
  }
}
