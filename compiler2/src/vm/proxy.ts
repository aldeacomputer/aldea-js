import { Module } from './module.js';
import { Internref } from './memory.js';
import { FieldKind, MethodKind, ObjectNode } from '../abi/types.js';
import { allExportedObjects } from '../abi/query.js'

/**
 * This module is highly experimental and in fact doesn't properly work yet.
 * 
 * Tread carefully.
 */


export function proxifyModule(mod: Module) {
  return allExportedObjects(mod.abi).reduce((acc: any, obj: ObjectNode) => {
    acc[obj.name] = createClassProxy(obj, mod)
    return acc
  }, {})
}


function createClassProxy(obj: ObjectNode, mod: Module) {
  const klass = new Function(`return class ${obj.name} {}`)()
  return new Proxy(klass, {
    construct(tgt: typeof klass, args: any[], inst: any) {
      inst.ref = mod.callMethod(`${obj.name}_constructor`, args)
      return createInstanceProxy(inst, obj, mod)
    },

    get(tgt: typeof klass, prop: string) {
      if (obj.methods.some(n => n.name === prop && n.kind === MethodKind.STATIC)) {
        return createStaticMethodProxy(`${obj.name}_${prop}`, mod)

      } else {
        return Reflect.get(tgt, prop)
      }
    }
  })
}


function createInstanceProxy(inst: {ref: Internref}, obj: ObjectNode, mod: Module) {
  return new Proxy(inst, {
    get(tgt: typeof inst, prop: string) {
      if (prop === 'state') {
        return mod.getState(obj.name, tgt.ref)

      } else if (obj.fields.some(n => n.name === prop && n.kind === FieldKind.PUBLIC)) {
        return mod.getProp(`${obj.name}.${prop}`, tgt.ref)

      } else if (obj.methods.some(n => n.name === prop && n.kind === MethodKind.INSTANCE)) {
        return createInstanceMethodProxy(tgt, `${obj.name}$${prop}`, mod)

      } else {
        return Reflect.get(tgt, prop)
      }
    }
  })
}


function createStaticMethodProxy(fn: string, mod: Module) {
  return new Proxy(mod.callMethod, {
    apply(tgt: Function, thisArg: any, args: any[]) {
      return mod.callMethod(fn, args)
    }
  })
}


function createInstanceMethodProxy(inst: {ref: Internref}, fn: string, mod: Module) {
  return new Proxy(mod.callMethod, {
    apply(tgt: Function, thisArg: any, args: any[]) {
      args.unshift(inst.ref)
      return mod.callMethod(fn, args)
    }
  })
}
