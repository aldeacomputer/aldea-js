import { CBOR, Sequence } from 'cbor-redux'

import {
  Abi,
  MethodKind,
} from "../abi/types.js"

import {
  findExportedObject,
  findObjectField,
  findObjectMethod,
} from '../abi/query.js'

import {
  liftValue,
  liftInternref,
  lowerValue,
  lowerInternref,
  lowerObject,
  getObjectMemLayout,
  getTypedArrayConstructor
} from "./memory.js"

/**
 * Internref class - wraps around a WASM Ptr
 */
export class Internref {
  name: string;
  ptr: number;

  constructor(name: string, ptr: number) {
    this.name = name
    this.ptr = ptr
  }
}

/**
 * Externref class
 */
export class Externref {
  name: string;
  origin: ArrayBuffer;

  constructor(name: string, origin: ArrayBuffer) {
    this.name = name
    this.origin = origin
  }
}

/**
 * Class schema interface
 */
export interface Schema {
  [key: string]: string
}

/**
 * AssemblyScript Exports interface
 */
export interface ExportsWithRuntime extends WebAssembly.Exports {
  __new(size: number, id: number): number;
  __pin(ptr: number): number;
  __unpin(ptr: number): void;
  __collect(): void;
  [key: string]: (...args: number[]) => number | void;
}

/**
 * Module class
 * 
 * Wraps around a WASM module and ABI, and provides an interface for calling
 * methods, accessing properties, serializing state and restoring an instance
 * from serialized state.
 */
export class Module {
  abi: Abi;
  exports: ExportsWithRuntime;
  memory: WebAssembly.Memory;

  constructor(wasm: WebAssembly.Instance, abi: Abi) {
    this.abi = abi
    this.exports = wasm.exports as ExportsWithRuntime
    this.memory = wasm.exports.memory as WebAssembly.Memory
  }

  callMethod(methodStr: string, args: any[] = []): any {
    const [expName, methodName] = methodStr.split(/(?:_|\$)/)
    const obj = findExportedObject(this.abi, expName, `unknown export: ${expName}`)
    const method = findObjectMethod(obj, methodName, `unknown method: ${methodName}`)
    
    const ptrs = []
    if (method.kind === MethodKind.INSTANCE) {
      if (!(args[0] instanceof Internref)) {
        throw new Error(`arg error: ${methodStr} arg[0] must be internref`)
      }
      ptrs.push(lowerInternref(args.shift()))
    }
    method.args.forEach((a, i) => {
      ptrs.push(lowerValue(this, a.type, args[i]))
    })

    const result = this.exports[methodStr](...ptrs) as number
    return method.kind === MethodKind.CONSTRUCTOR ?
      liftInternref(this, obj, result >>> 0) :
      liftValue(this, method.rtype, result)
  }

  getProp(propStr: string, ref: Internref): any {
    const [expName, fieldName] = propStr.split('.')
    const obj = findExportedObject(this.abi, expName, `unknown export: ${expName}`)
    const field = findObjectField(obj, fieldName, `unknown field: ${fieldName}`)

    const offsets = getObjectMemLayout(obj)
    const { offset, align } = offsets[field.name]
    const TypedArray = getTypedArrayConstructor(field.type)
    const val = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]
    return liftValue(this, field.type, val)
  }

  getSchema(name: string): Schema  {
    const obj = findExportedObject(this.abi, name, `unknown export: ${name}`)
    return obj.fields.reduce((s: Schema, prop) => {
      s[prop.name] = prop.type.name
      return s
    }, {})
  }

  getState(name: string, ref: Internref): any[] {
    const obj = findExportedObject(this.abi, name, `unknown export: ${name}`)
    return obj.fields.reduce((arr: any, field) => {
      arr.push(this.getProp(`${name}.${field.name}`, ref))
      return arr
    }, [])
  }

  restore(name: string, data: ArrayBuffer): Internref {
    const obj = findExportedObject(this.abi, name, `unknown export: ${name}`)
    const vals = CBOR.decode(data, null, { mode: 'sequence' })
    const ptr = lowerObject(this, obj, vals.data)
    return liftInternref(this, obj, ptr)
  }

  serialize(name: string, ref: Internref): ArrayBuffer {
    const seq = Sequence.from(this.getState(name, ref))
    return CBOR.encode(seq)
  }

  //cache<T>(key: string, callback: () => any, error?: string): T {
  //  if (!this._cache.get(key)) {
  //    this._cache.set(key, callback())
  //  }
  //  if (!!error && !this._cache.get(key)) {
  //    throw new Error(error)
  //  }
  //  return this._cache.get(key)
  //}
}
