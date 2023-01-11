import { blake3 } from '@noble/hashes/blake3'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import { isExported, isPrivate, isProtected } from './filters.js'
import { ClassWrap, FieldWrap, MethodWrap, ObjectWrap } from './nodes.js'
import { normalizeTypeName } from '../abi.js'
import { MethodKind, TypeNode } from '../abi/types.js'

/**
 * Writes a function exported from the entry module that simply calls the
 * same function on the given Object.
 * 
 * For instance methods, an extra argument is added for the instance Ptr.
 */
export function writeExportedMethod(method: MethodWrap, obj: ClassWrap): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const separator = isInstance ? '$' : '_'
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = isConstructor ? `${obj.name}` : normalizeTypeName(method.rtype)
  const callable = isConstructor ? `new ${obj.name}` : (
    isInstance ? `ctx.${method.name}` : `${obj.name}.${method.name}`
  )
  if (isInstance) args.unshift(`ctx: ${obj.name}`)

  return `
  export function ${obj.name}${separator}${method.name}(${args.join(', ')}): ${rtype} {
    return ${callable}(${ method.args.map((_f, i) => `a${i}`).join(', ') })
  }
  `.trim()
}

/**
 * Writes a default constructor class with VM hook.
 */
export function writeConstructor(obj: ClassWrap): string {
  return `
  constructor() {
    ${ obj.extends ? 'super()' : '' }
    ${ writeConstructorHook(obj) }
  }
  `.trim()
}

/**
 * Writes a VM constructor hook method call.
 */
export function writeConstructorHook(obj: ClassWrap): string {
  return `vm_constructor(this, '${obj.name}')`
}

/**
 * Writes a placeholder proxy class wrapper for the specific Class, around the
 * given member strings.
 */
export function writeLocalProxyClass(obj: ClassWrap, members: string[]): string {
  return `
  class ${obj.name} {
    ${ members.join('\n') }
  }
  `.trim()
}

/**
 * Writes a local proxy method. Wraps the native call in `vm_local_call_start`
 * and `vm_local_call_end`.
 */
 export function writeLocalProxyMethod(method: MethodWrap, obj: ClassWrap): string {
  const access = isPrivate(method.node.flags) ? 'private ' : (
    isProtected(method.node.flags) ? 'protected ' : ''
  )
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const returns = method.rtype?.name && method.rtype?.name !== 'void'
  return `
  ${access}${method.name}(${args.join(', ')}): ${normalizeTypeName(method.rtype)} {
    vm_local_call_start(this, '${obj.name}$${method.name}')
    ${returns ? 'const res = ' : ''}this._${method.name}(${ method.args.map((_f, i) => `a${i}`).join(', ') })
    vm_local_call_end()
    ${returns ? 'return res' : ''}
  }
  `.trim()
}

/**
 * Writes a proxy class wrapper for the specific Class, around the given member
 * strings.
 */
export function writeRemoteProxyClass(obj: ClassWrap, members: string[]): string {
  const prefix = isExported(obj.node.flags) ? 'export ' : ''
  return `
  ${prefix}class ${obj.name} extends RemoteJig {
    ${ members.join('\n') }
  }
  `.trim()
}

/**
 * Writes a getter on a proxy class. Returns the result of `vm_remote_prop`.
 */
export function writeRemoteProxyGetter(field: FieldWrap, obj: ClassWrap): string {
  return `
  get ${field.name}(): ${field.type.name} {
    return vm_remote_prop<${field.type.name}>(this.origin, '${obj.name}.${field.name}')
  }
  `.trim()
}

/**
 * Writes a method on a proxy class. Returns the result of `vm_call`.
 */
export function writeRemoteProxyMethod(method: MethodWrap, obj: ObjectWrap, origin: string): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const isStatic = method.kind === MethodKind.STATIC
  const args = method.args.map((f, i) => `a${i}: ${f.type.name}`)
  const rtype = isConstructor ? 'ArrayBuffer' : method.rtype?.name
  const prefix = isConstructor ? 'this.origin =' : 'return'
  const caller = isInstance ?
    `vm_remote_call_i<${rtype}>(this.origin, '${obj.name}$${method.name}', args.buffer)` :
    `vm_remote_call_s<${rtype}>('${origin}', '${obj.name}_${method.name}', args.buffer)` ;

  return `
  ${isStatic ? 'static ' : ''}${method.name}(${args.join(', ')})${isConstructor ? '' : `: ${rtype}`} {
    ${ writeArgWriter(method.args as FieldWrap[]) }
    ${prefix} ${caller}
  }
  `.trim()
}

/**
 * Writes statements to encode the given array of fields to a ArrayBuffer.
 * 
 * Each field is encoded either as an integer value or a 32bit Ptr.
 */
export function writeArgWriter(fields: FieldWrap[]): string {
  const bytes = fields.reduce((sum, n) => sum + getTypeBytes(n.type), 0)
  const chunks = fields.map((n, i) => `args.${ writeArgWriterEncodeMethod(n, i) }`)
  return `
  const args = new ArgWriter(${bytes})
  ${ chunks.join('\n') }
  `.trim()
}

/**
 * Writes the appropriate encode function statement for the given field.
 */
export function writeArgWriterEncodeMethod(field: FieldWrap, i: number): string {
  switch(field.type.name) {
    case 'f32': return `writeF32(a${i})`
    case 'i64': return `writeF64(a${i})`
    case 'i8':  return `writeI8(a${i})`
    case 'i16': return `writeI16(a${i})`
    case 'i32': return `writeI32(a${i})`
    case 'i64': return `writeI64(a${i})`
    case 'u8':  return `writeU8(a${i})`
    case 'u16': return `writeU16(a${i})`
    case 'u32': return `writeU32(a${i})`
    case 'u64': return `writeU64(a${i})`
    default:
      return `writeU32(changetype<usize>(a${i}) as u32)`
  }
}

/**
 * Writes exported method for putting a value into a set.
 * 
 * These methods are a hack used to lower complex objects into memory.
 */
export function writeSetPutter(type: TypeNode): string {
  const setType = normalizeTypeName(type)
  const valType = normalizeTypeName(type.args[0])
  const hash = toHex(blake3(setType, { dkLen: 4 }))

  return `
  export function __put_set_entry_${hash}(set: ${setType}, val: ${valType}): void {
    set.add(val)
  }
  `.trim()
}

/**
 * Writes exported method for putting a key and value into a map.
 * 
 * These methods are a hack used to lower complex objects into memory.
 */
export function writeMapPutter(type: TypeNode): string {
  const mapType = normalizeTypeName(type)
  const keyType = normalizeTypeName(type.args[0])
  const valType = normalizeTypeName(type.args[1])
  const hash = toHex(blake3(mapType, { dkLen: 4 }))

  return `
  export function __put_map_entry_${hash}(map: ${mapType}, key: ${keyType}, val: ${valType}): void {
    map.set(key, val)
  }
  `.trim()
}

/**
 * Returns the number of bytes for the given type.
 */
function getTypeBytes(type: TypeNode): number {
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