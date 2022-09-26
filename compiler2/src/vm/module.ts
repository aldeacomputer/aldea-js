import {
  Abi,
  FieldNode,
  MethodKind,
  MethodNode,
  ObjectKind,
  ObjectNode,
} from "../abi/types.js"

import {
  Internref,
  createRegistry,
  liftValue,
  liftInternref,
  lowerValue,
  lowerInternref,
  getObjectMemLayout,
  getTypeBufConstructor
} from "./memory.js"

/**
 * TODO
 */
export interface Schema {
  [key: string]: string
}

/**
 * TODO
 */
export interface ExportsWithRuntime extends WebAssembly.Exports {
  __new(size: number, id: number): number;
  __pin(ptr: number): number;
  __unpin(ptr: number): void;
  __collect(): void;
  [key: string]: (...args: number[]) => number | void;
}

/**
 * TODO
 */
export class Module {
  abi: Abi;
  exports: ExportsWithRuntime;
  memory: WebAssembly.Memory;
  refcounts: Map<number, number>;
  registry: FinalizationRegistry<number>;
  private _cache: Map<string, any>;

  constructor(wasm: WebAssembly.Instance, abi: Abi) {
    this.abi = abi
    this.exports = wasm.exports as ExportsWithRuntime
    this.memory = wasm.exports.memory as WebAssembly.Memory
    this.refcounts = new Map<number, number>()
    this.registry = createRegistry(this)
    this._cache = new Map<string, any>()
  }

  callMethod(methodStr: string, args: any[] = []): any {
    const [expName, methodName] = methodStr.split(/(?:_|\$)/)
    const exp = this.findExportedObject(expName)
    const method = this.findObjectMethod(exp, methodName)
    
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
      liftInternref(this, result >>> 0) :
      liftValue(this, method.rtype, result)
  }

  getProp(propStr: string, ptr: Internref): any {
    const [expName, fieldName] = propStr.split('.')
    const exp = this.findExportedObject(expName)
    const field = this.findObjectField(exp, fieldName)

    const offsets = getObjectMemLayout(exp)
    const { offset, align } = offsets[field.name]
    const TypedArray = getTypeBufConstructor(field.type)
    const val = new TypedArray(this.memory.buffer)[ptr as number + offset >>> align]
    return liftValue(this, field.type, val)
  }

  getSchema(name: string): Schema  {
    const exp = this.findExportedObject(name)
    return exp.fields.reduce((obj: Schema, prop) => {
      obj[prop.name] = prop.type.name
      return obj
    }, {})
  }

  getState(name: string, ptr: Internref): any[] {
    const exp = this.findExportedObject(name)
    return exp.fields.reduce((arr: any, field) => {
      arr.push(this.getProp(`${name}.${field.name}`, ptr))
      return arr
    }, [])
  }

  private collectExportedObjects(): ObjectNode[] {
    return this.abi.objects.filter(n => n.kind === ObjectKind.EXPORTED)
  }

  private findExportedObject(name: string): ObjectNode {
    const obj = this.collectExportedObjects().find(n => n.name === name)
    if (!obj) { throw new Error(`unknown export: ${name}`) }
    return obj
  }

  private findObjectMethod(obj: ObjectNode, name: string): MethodNode {
    const method = obj.methods.find(n => n.name === name)
    if (!method) { throw new Error(`unknown method: ${name}`) }
    return method
  }

  private findObjectField(obj: ObjectNode, name: string): FieldNode {
    const field = obj.fields.find(n => n.name === name)
    if (!field) { throw new Error(`unknown field: ${name}`) }
    return field
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
