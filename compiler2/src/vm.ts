import fs from 'fs/promises'
import { abiFromCbor } from './abi.js'
import { Module } from './vm/module.js'
import { liftString } from './vm/memory.js'

/**
 * TODO
 */
export class VM {
  modules: Map<string, Module>

  constructor() {
    this.modules = new Map<string, Module>()
  }

  async load(key: string, wasmPath: string, abiPath: string): Promise<void> {
    const wasmBuf = await fs.readFile(wasmPath)
    const abiBuf = await fs.readFile(abiPath)
    const abi = abiFromCbor(abiBuf.buffer)

    const wasm = await WebAssembly.instantiate(wasmBuf, {
      env: {
        abort: (a0: number, a1: number, a2: number, a3: number) => {
          // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
          const mod = this.getModule(key)
          const message = liftString(mod, a0 >>> 0)
          const fileName = liftString(mod, a1 >>> 0)
          const lineNumber = a2 >>> 0
          const columnNumber = a3 >>> 0
          throw new Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`)
        },
        'console.log': (a0: number) => {
          const mod = this.getModule(key)
          const message = liftString(mod, a0 >>> 0)
          console.log(message)
        }
      }
    })

    const mod = new Module(wasm.instance, abi)
    this.modules.set(key, mod)
  }

  getModule(key: string): Module {
    const mod = this.modules.get(key)
    if (!mod) throw new Error(`module not found: ${key}`)
    return mod
  }
}
