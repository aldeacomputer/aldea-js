import { ObjectNode, TypeNode } from '../abi/types.js';
import { Module } from './module.js'

/**
 * TODO
 */
export class Internref extends Number {}

/**
 * TODO
 */
export function createRegistry(mod: Module): FinalizationRegistry<number> {
  return new FinalizationRegistry((ptr: number) => release(mod, ptr))
}

/**
 * TODO
 */
export function liftValue(mod: Module, type: TypeNode | null, val: number | bigint): any {
  if (type === null || type.name === 'void') return;

  switch(type.name) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'u8':
    case 'u16':
    case 'u32':
    case 'f32':
    case 'f64':
      return val
    case 'i64':
    case 'u64':
      return BigInt.asUintN(64, val as bigint)
    case 'bool':
      return !!val
    case 'string':
      return liftString(mod, val as number >>> 0)
    default:
      throw new Error(`unspported type: ${type.name}`)
  }
}

/**
 * TODO
 */
export function liftInternref(mod: Module, ptr: number): Internref {
  const sentinel = new Internref(retain(mod, ptr))
  mod.registry.register(sentinel, ptr)
  return sentinel
}

/**
 * TODO
 */
export function liftString(mod: Module, ptr: number): string {
  const end = ptr + new Uint32Array(mod.memory.buffer)[ptr - 4 >>> 2] >>> 1
  const memU16 = new Uint16Array(mod.memory.buffer)
  let start = ptr >>> 1, string = "";
  while (end - start > 1024) {
    string += String.fromCharCode(...memU16.subarray(start, start += 1024))
  }
  return string + String.fromCharCode(...memU16.subarray(start, end))
}

/**
 * TODO
 */
export function lowerValue(mod: Module, type: TypeNode, val: any) {
  switch(type.name) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'u8':
    case 'u16':
    case 'u32':
    case 'f32':
    case 'f64':
      return val
    case 'i64':
    case 'u64':
      return val || 0n
    case 'bool':
      return val ? 1 : 0
    case 'string':
      return lowerString(mod, val)
    default:
      throw new Error(`unspported type: ${type.name}`)
  }
}

/**
 * TODO
 */
function lowerString(mod: Module, val: string) {
  if (val === null) return 0;
  const ptr = mod.exports.__new(val.length << 1, 1) >>> 0
  const memU16 = new Uint16Array(mod.memory.buffer);
  for (let i = 0; i < val.length; ++i) {
    memU16[(ptr >>> 1) + i] = val.charCodeAt(i)
  }
  return ptr
}

/**
 * TODO
 */
export function lowerInternref(ptr: Internref) {
  if (ptr == null) return 0;
  if (ptr instanceof Internref) return ptr.valueOf();
  throw TypeError("internref expected");
}

interface MemoryLayout {
  [field: string]: {
    align: 0 | 1 | 2 | 4;
    offset: number;
  }
}

/**
 * TODO
 */
export function getObjectMemLayout(object: ObjectNode): MemoryLayout {
  return object.fields.reduce((obj: any, field, i, fields) => {
    const thisBytes = getTypeBytes(field.type)
    let offset = 0
    let align = 0

    if (i > 0) {
      const prevField = fields[i-1]
      const prevBytes = getTypeBytes(prevField.type)
      const prevOffset = obj[prevField.name].offset
      offset = Math.ceil((prevOffset + prevBytes) / thisBytes) * thisBytes
    }

    if (thisBytes > 1) {
      align = Math.ceil(thisBytes / 3)
    }
    
    obj[field.name] = { offset, align }
    return obj
  }, {})
}

/**
 * TODO
 */
export function getTypeBytes(type: TypeNode): number {
  switch(type.name) {
    case 'i8':
    case 'u8':
    case 'bool':
    case 'null':
      return 1
    case 'i16':
    case 'u16':
      return 2
    case 'i64':
    case 'f64':
    case 'u64':
      return 8
    default:
      return 4
  }
}

/**
 * TODO
 */
export function getTypeBufConstructor(type: TypeNode) {
  switch(type.name) {
    case 'i8': return Int8Array
    case 'i16': return Int16Array
    case 'i32': return Int32Array
    case 'i64': return BigInt64Array
    case 'f32': return Float32Array
    case 'f64': return Float64Array
    case 'u8': return Uint8Array
    case 'u16': return Uint16Array
    case 'u64': return BigUint64Array
    default:
      return Uint32Array
  }
}


function retain(mod: Module, ptr: number) {
  if (ptr) {
    const refcount = mod.refcounts.get(ptr);
    if (refcount) { mod.refcounts.set(ptr, refcount + 1) }
    else { mod.refcounts.set(mod.exports.__pin(ptr), 1) }
  }

  return ptr;
}

function release(mod: Module, ptr: number) {
  if (ptr) {
    const refcount = mod.refcounts.get(ptr);
    if (refcount === 1) {
      mod.exports.__unpin(ptr)
      mod.refcounts.delete(ptr)
    }
    else if (refcount) { mod.refcounts.set(ptr, refcount - 1) }
    else { throw Error(`invalid refcount '${refcount}' for reference '${ptr}'`) }
  }
}