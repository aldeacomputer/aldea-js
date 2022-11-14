import fs from 'fs/promises'
import { abiFromCbor } from './abi.js'
import { Module } from './vm/module.js'
import { liftBuffer, liftString } from './vm/memory.js'

/**
 * A simple mans' Vm module.
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

    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: 2,
    })

    const wasm = await WebAssembly.instantiate(wasmBuf, {
      env: {
        memory,
        // ~lib/builtins/abort(~lib/string/String | null?, ~lib/string/String | null?, u32?, u32?) => void
        abort: (messagePtr: number, fileNamePtr: number, lineNumPtr: number, colNumPtr: number) => {
          const mod = this.getModule(key)
          const message = liftString(mod, messagePtr >>> 0)
          const fileName = liftString(mod, fileNamePtr >>> 0)
          const lineNumber = lineNumPtr >>> 0
          const columnNumber = colNumPtr >>> 0
          console.log('msgPtr', messagePtr)
          throw new Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`)
        },
        'console.log': (messagePtr: number) => {
          const mod = this.getModule(key)
          const message = liftString(mod, messagePtr >>> 0)
          console.log(message)
        }
      },
      vm: {
        nlog: (num: number) => {
          console.log('nlog', num)
        },
        vm_constructor: () => { console.log('vm', 'vm_constructor') },
        vm_local_authcheck: () => {
          console.log('vm', 'vm_local_authcheck')
          return true
        },
        vm_local_lock: (jig: number, type: number, args: number) => {
          console.log('vm', 'vm_local_lock')
          const mod = this.getModule(key)
          const pkh = liftBuffer(mod, args >>> 0)
          console.log(type, pkh)
        },
        vm_local_state: () => { console.log('vm', 'vm_local_state') },
        vm_remote_authcheck: () => {
          console.log('vm', 'vm_remote_authcheck')
          return true
        },
        vm_remote_lock: () => { console.log('vm', 'vm_remote_lock') },
        vm_remote_state: () => { console.log('vm', 'vm_remote_state') },

        vm_local_call_start: (jigPtr: number, fnPtr: number) => {
          const mod = this.getModule(key)
          const fn = liftString(mod, fnPtr)
          console.log('VM', 'local', `${jigPtr} => ${fn}`)
        },

        vm_local_call_end: () => {
          console.log('VM', 'end')
        },

        vm_remote_call_i: () => {},
        vm_remote_call_s: () => {},
        vm_remote_prop: () => {},

//        // vm_call<T>(string, ArrayBuffer, string, ArrayBuffer): T
//        vm_call: (rmtOriginPtr: number, rmtRefPtr: number, fnStrPtr: number, argBufPtr: number) => {
//          const mod = this.getModule(key)
//          const rmtOrigin = liftString(mod, rmtOriginPtr >>> 0)
//          const rmtRefBuf = liftBuffer(mod, rmtRefPtr >>> 0)
//          const fnStr = liftString(mod, fnStrPtr >>> 0)
//          const argBuf = liftBuffer(mod, argBufPtr >>> 0)
//
//          const [className, fn] = fnStr.split(/(?:_|\$)/)
//          const obj = findImportedObject(mod.abi, className, 'could not find object')
//          const method = findObjectMethod(obj, fn, 'could not find method')
//
//          // In my vm I refer to remote jigs by ptr
//          // miguel can skip this and pass the buffer
//          const view = new DataView(rmtRefBuf)
//          const rmtRef = new Internref(className, view.getUint32(0))
//
//          const argReader = new ArgReader(argBuf)
//          const vals = method.args.reduce((vals: any[], n: FieldNode) => {
//            const ptr = readType(argReader, n.type)
//            vals.push(liftValue(mod, n.type, ptr))
//            return vals
//          }, [rmtRef])
//          
//          const rmtMod = this.getModule(rmtOrigin)
//          const val = rmtMod.callMethod(fnStr, vals)
//          return lowerValue(mod, method.rtype, val)
//        },
//        // vm_prop(string, ArrayBuffer, string)
//        vm_prop: (rmtOriginPtr: number, rmtRefPtr: number, propStrPtr: number) => {
//          const mod = this.getModule(key)
//          const rmtOrigin = liftString(mod, rmtOriginPtr >>> 0)
//          const rmtRefBuf = liftBuffer(mod, rmtRefPtr >>> 0)
//          const propStr = liftString(mod, propStrPtr >>> 0)
//
//          const className = propStr.split('.')[0]
//
//          // In my vm I refer to remote jigs by ptr
//          // miguel can skip this and pass the buffer
//          const view = new DataView(rmtRefBuf)
//          const rmtRef = new Internref(className, view.getUint32(0))
//          
//          const rmtMod = this.getModule(rmtOrigin)
//          const val = rmtMod.getProp(propStr, rmtRef)
//          return lowerValue(mod, { name: 'string', args: [] }, val)
//        }
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
