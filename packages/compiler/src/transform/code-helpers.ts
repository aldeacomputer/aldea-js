import { blake3 } from '@noble/hashes/blake3'
import { bytesToHex as toHex } from '@noble/hashes/utils'
import { ClassWrap, FieldWrap, FunctionWrap, InterfaceWrap, MethodWrap } from './nodes.js'
import { normalizeTypeName } from '../abi.js'
import { MethodKind, TypeNode } from '../abi/types.js'

/**
 * Writes a plain class declaration around a empty constructor method.
 */
export function writeClass(obj: ClassWrap): string {
  return `
  class ${obj.name} {
    ${ writeConstructor(obj) }
  }
  `.trim()
}

/**
 * Writes a plain constructor method.
 */
export function writeConstructor(obj: ClassWrap): string {
  return `
  constructor() {
    ${ obj.extends ? 'super()' : '' }
  }
  `.trim()
}

/**
 * Writes an interface for the given jig class.
 */
export function writeJigInterface(obj: ClassWrap, fields: FieldWrap[], methods: MethodWrap[]): string {
  const fieldCode = fields
    .map(n => `${n.name}: ${normalizeTypeName(n.type)}`)
    .join('\n')
  const methodCode = methods
    .map(n => {
      const args = n.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
      return `${n.name}(${args.join(', ')}): ${normalizeTypeName(n.rtype)}`
    })
    .join('\n')

  return `
  interface ${obj.name} extends ${obj.extends} {
    ${fieldCode}
    ${methodCode}
  }
  `.trim()
}

/**
 * Writes a local class declaration for the given jig class.
 * 
 * Returns an empty declaration as the transform method injects the body into
 * the AST.
 */
export function writeJigLocalClass(obj: ClassWrap): string {
  const interfaces = obj.implements
    .map(normalizeTypeName)
    .concat(obj.name)
    .join(', ')

  return `
  class _Local${obj.name} extends _Local${obj.extends} implements ${interfaces} {}
  `.trim()
}

/**
 * Writes a remote class declaration for the given jig class.
 * 
 * Ensures compilation by inlining an idof call.
 */
export function writeJigRemoteClass(obj: ClassWrap, fields: FieldWrap[], methods: MethodWrap[]): string {
  const interfaces = obj.implements
    .map(normalizeTypeName)
    .concat(obj.name)
    .join(', ')

  const fieldCode = fields.reduce((acc: string[], n: FieldWrap): string[] => {
    acc.push(writeRemoteGetter(n, obj))
    return acc
  }, []).join('\n')

  const methodCode = methods.reduce((acc: string[], n: MethodWrap): string[] => {
    acc.push(writeRemoteMethod(n, obj))
    return acc
  }, []).join('\n')

  return `
  class _Remote${obj.name} extends _Remote${obj.extends} implements ${interfaces} {
    ${fieldCode}
    ${methodCode}
  }
  // required to ensure compilation
  idof<_Remote${obj.name}>()
  `.trim()
}

/**
 * Writes an export function exported for the given Jig class method.
 * 
 * For instance methods, an extra argument is added for the instance Ptr.
 */
export function writeExportedFunction(method: MethodWrap, obj: ClassWrap): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const separator = isInstance ? '$' : '_'
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = isConstructor ? `${obj.name}` : normalizeTypeName(method.rtype)
  const callable = isConstructor ? `new _Local${obj.name}` : (
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
 * Writes a remote class declaration for the given interface.
 * 
 * Ensures compilation by inlining an idof call.
 */
export function writeInterfaceRemoteClass(obj: InterfaceWrap, fields: FieldWrap[], methods: FunctionWrap[]): string {
  const fieldCode = fields.reduce((acc: string[], n: FieldWrap): string[] => {
    acc.push(writeRemoteGetter(n, obj))
    return acc
  }, []).join('\n')

  const methodCode = methods.reduce((acc: string[], n: FunctionWrap): string[] => {
    acc.push(writeRemoteInterfaceMethod(n, obj))
    return acc
  }, []).join('\n')

  return `
  class _Remote${obj.name} extends _RemoteJig implements ${obj.name} {
    ${fieldCode}
    ${methodCode}
  }
  // required to ensure compilation
  idof<_Remote${obj.name}>()
  `.trim()
}

/**
 * Writes a remote class declaration for the given imported class.
 */
export function writeImportedRemoteClass(obj: ClassWrap, fields: FieldWrap[], methods: MethodWrap[], pkg: string): string {
  const fieldCode = fields.reduce((acc: string[], n: FieldWrap): string[] => {
    acc.push(writeRemoteGetter(n, obj))
    return acc
  }, []).join('\n')

  const methodCode = methods.reduce((acc: string[], n: MethodWrap): string[] => {
    acc.push(writeRemoteMethod(n, obj, pkg))
    return acc
  }, []).join('\n')

  return `
  class ${obj.name} extends _RemoteJig {
    ${fieldCode}
    ${methodCode}
  }
  `.trim()
}

/**
 * Writes a remote function declaration for the given imported function.
 */
export function writeImportedRemoteFunction(fn: FunctionWrap, pkg: string): string {
  const args = fn.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = normalizeTypeName(fn.rtype)

  return `
  export function ${fn.name}(${args.join(', ')}): ${rtype} {
    ${ writeArgWriter(fn.args as FieldWrap[]) }
    return vm_call_function<${rtype}>('${pkg}', '${fn.name}', args.buffer)
  }
  `.trim()
}

/**
 * Writes exported function for putting a value into a set.
 * 
 * We need some way of lowering complex types into memory, and this is it.
 */
export function writeSetSetter(type: TypeNode): string {
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
 * We need some way of lowering complex types into memory, and this is it.
 */
export function writeMapSetter(type: TypeNode): string {
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
 * Writes a getter on a remote class. Returns the result of `vm_get_prop`.
 */
export function writeRemoteGetter(field: FieldWrap, obj: ClassWrap | InterfaceWrap): string {
  const type = normalizeTypeName(field.type)
  return `
  get ${field.name}(): ${type} {
    return vm_get_prop<${type}>(this.$output.origin, '${field.name}')
  }
  `.trim()
}

/**
 * Writes a method on a remote class.
 * 
 * - For constructors calls `vm_constructor_local` or `vm_constructor_remote`.
 * - For static methods returns the result of `vm_call_static`.
 * - For instance methods returns the result of `vm_call_method`.
 */
export function writeRemoteMethod(method: MethodWrap, obj: ClassWrap, pkg?: string): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const isStatic = method.kind === MethodKind.STATIC

  if (isStatic && !pkg) { throw new Error('static methods require package ID') }
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)

  if (isConstructor) {
    const callable = pkg ?
      `vm_constructor_remote('${pkg}', '${obj.name}', args.buffer)` :
      `vm_constructor_local('${obj.name}', args.buffer)` ;

    return `
    constructor(${args.join(', ')}) {
      ${ writeArgWriter(method.args as FieldWrap[]) }
      const params = ${callable}
      super(params)
    }
    `.trim()

  } else {
    const rtype = normalizeTypeName(method.rtype)
    const callable = isInstance ?
      `vm_call_method<${rtype}>(this.$output.origin, '${method.name}', args.buffer)` :
      `vm_call_static<${rtype}>('${pkg}', '${obj.name}_${method.name}', args.buffer)` ;

    return `
    ${isStatic ? 'static ' : ''}${method.name}(${args.join(', ')}): ${rtype} {
      ${ writeArgWriter(method.args as FieldWrap[]) }
      return ${callable}
    }
    `.trim()
  }
}

/**
 * Writes a method on a remote class that is derived from an interface.
 * 
 * As `writeRemoteMethod` but for intefaces it is always an instance method so
 * can have simpler implementation.
 */
export function writeRemoteInterfaceMethod(method: FunctionWrap, obj: InterfaceWrap, pkg?: string): string {
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = normalizeTypeName(method.rtype)
  return `
  ${method.name}(${args.join(', ')}): ${rtype} {
    ${ writeArgWriter(method.args as FieldWrap[]) }
    return vm_call_method<${rtype}>(this.$output.origin, '${method.name}', args.buffer)
  }
  `.trim()
}

/**
 * Writes statements to encode the given array of fields to an ArrayBuffer.
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
    case 'f64': return `writeF64(a${i})`
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