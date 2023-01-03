import path from 'path'
import {__encodeArgs, WasmInstance} from './wasm-instance.js'
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

const __dir = fileURLToPath(import.meta.url)

// Magic Coin Pkg ID
const COIN_PKG_ID = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
])

export class VM {
  private storage: Storage;

  constructor (storage: Storage) {
    this.storage = storage
    this.addPreCompiled('aldea/coin.wasm', 'aldea/coin.ts', COIN_PKG_ID)
  }

  async execTx(tx: Tx): Promise<TxExecution> {
    const currentExecution = new TxExecution(tx, this)
    await currentExecution.run()
    this.storage.persist(currentExecution)
    return currentExecution
  }

  createWasmInstance (moduleId: Uint8Array): WasmInstance {
    const existingModule = this.storage.getModule(moduleId)
    return new WasmInstance(existingModule.mod, existingModule.abi, moduleId)
  }


  findJigStateByOrigin (origin: Pointer) {
    return this.storage.getJigStateByOrigin(origin, () => {
      throw new ExecutionError(`unknown jig: ${origin.toString()}`)
    })
  }

  findJigStateByOutputId (outputId: Uint8Array) {
    const jigState = this.storage.getJigStateByOutputId(outputId, () => {
      throw new ExecutionError(`unknown jig: ${base16.encode(outputId)}`)
    });
    const lastRef = this.storage.tipFor(jigState.origin)
    if (!Buffer.from(jigState.id()).equals(Buffer.from(lastRef))) {
      throw new ExecutionError(`jig already spent: ${outputId}`)
    }
    this.storage.tipForOrigin(jigState.id())
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
      result.output.wasm
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
    this.storage.addPackage(
      id,
      module,
      abi,
      sources,
      entries,
      new Uint8Array(wasmBuffer)
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
      __encodeArgs([amount]),
      COIN_PKG_ID,
      new UserLock(address).serialize()
    )
    this.storage.addJig(minted)
    return minted
  }
}
