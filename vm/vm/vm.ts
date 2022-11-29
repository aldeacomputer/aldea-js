import path from 'path'
import { WasmInstance } from './wasm-instance.js'
import { fileURLToPath } from 'url'
import { TxExecution } from './tx-execution.js'
import fs from "fs"
import {Storage} from "./storage.js";
import {Transaction} from "./transaction.js";
import {abiFromCbor, abiFromJson} from '@aldea/compiler/abi'
import {compile} from '@aldea/compiler'
import {blake3} from "@aldea/sdk-js/support/hash";
import {Location} from "@aldea/sdk-js";

const __dir = fileURLToPath(import.meta.url)

export class VM {
  private storage: Storage;

  constructor (storage: Storage) {
    this.storage = storage
  }

  execTx (tx: Transaction): TxExecution {
    const currentExecution = new TxExecution(tx, this)
    currentExecution.run()
    currentExecution.finalize()
    return currentExecution
  }

  createWasmInstance (moduleId: string): WasmInstance {
    const existingModule = this.storage.getModule(moduleId)
    return new WasmInstance(existingModule.mod, existingModule.abi, moduleId)
  }


  findJigState (location: Location) {
    return this.storage.getJigState(location)
  }

  async deployCode (entryPoint: string, sources: Map<string, string>): Promise<string> {
    const data = sources.get(entryPoint);
    if (!data) { throw new Error()}
    const id = Buffer.from(blake3(Buffer.from(data))).toString('hex')
    if (this.storage.hasModule(id)) {
      return id
    }

    const obj: {[key: string]: string} = {}
    for (const [key, value] of sources.entries()) {
      obj[key] = value
    }

    const result = await compile(obj)
    this.storage.addModule(
      id,
      new WebAssembly.Module(result.output.wasm),
      abiFromCbor(result.output.abi.buffer)
    )
    return id
  }

  addPreCompiled (compiledRelative: string, sourceRelative: string): string {
    const srcPath = path.join(__dir, '../../assembly', sourceRelative)
    const id = Buffer.from(blake3(fs.readFileSync(srcPath))).toString('hex')
    if (this.storage.hasModule(id)) {
      return id
    }

    const modulePath = path.join(__dir, '../../build', compiledRelative)
    const wasmBuffer = fs.readFileSync(modulePath)
    const module = new WebAssembly.Module(wasmBuffer)
    const abiPath = modulePath.replace('wasm', 'abi.json')
    const abi = abiFromJson(fs.readFileSync(abiPath).toString())
    this.storage.addModule(
      id,
      module,
      abi
    )
    return id
  }
}
