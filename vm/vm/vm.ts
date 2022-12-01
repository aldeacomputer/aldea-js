import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"
import {Storage} from "./storage.js";
import {abiFromCbor, abiFromJson} from '@aldea/compiler/abi'
import {compile} from '@aldea/compiler'
import {Location, Tx} from "@aldea/sdk-js";
import {ExecutionError} from "./errors.js";
import {calculatePackageId} from "./calculate-package-id.js";

const __dir = fileURLToPath(import.meta.url)

export class VM {
  private storage: Storage;

  constructor (storage: Storage) {
    this.storage = storage
  }

  async execTx(tx: Tx): Promise<TxExecution> {
    const currentExecution = new TxExecution(tx, this)
    await currentExecution.run()
    currentExecution.finalize()
    this.storage.persist(currentExecution)
    return currentExecution
  }

  createWasmInstance (moduleId: string): WasmInstance {
    const existingModule = this.storage.getModule(moduleId)
    return new WasmInstance(existingModule.mod, existingModule.abi, moduleId)
  }


  findJigState (location: Location) {
    return this.storage.getJigState(location, () => {
      throw new ExecutionError(`unknown jig: ${location.toString()}`)
    })
  }

  async deployCode (entries: string[], sources: Map<string, string>): Promise<string> {
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
      abiFromCbor(result.output.abi.buffer)
    )
    return id
  }

  addPreCompiled (compiledRelative: string, sourceRelative: string): string {
    const srcPath = path.join(__dir, '../../assembly', sourceRelative)
    const srcCode = fs.readFileSync(srcPath);
    const sources = new Map<string, string>()
    sources.set('index.ts', srcCode.toString())
    const id = calculatePackageId(['index.ts'], sources)
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
      abi
    )
    return id
  }
}
