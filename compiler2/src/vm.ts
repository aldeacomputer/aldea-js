import fs from 'fs/promises'
import { abiFromCbor } from './abi.js'
import { Module } from './vm/module.js'
import { liftBuffer, liftString, lowerBuffer, lowerValue } from './vm/memory.js'

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
      },
      vm: {
        vm_prop: (a0: number, a1: number, a2: number) => {
          // vm_prop(string, string, ArrayBuffer)
          const localMod = this.getModule(key)
          const clsOrigin = liftString(localMod, a0 >>> 0)
          const refBuf = liftBuffer(localMod, a1 >>> 0)
          const prop = liftString(localMod, a2 >>> 0)

          const view = new DataView(refBuf)
          const ref = view.getUint32(0)

          const remoteMod = this.getModule(clsOrigin)
          const val = remoteMod.getProp(prop, ref)

          return lowerValue(localMod, { name: 'string', args: [] }, val)
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
