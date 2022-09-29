import { TransformCtx } from './ctx.js'
import { FieldWrap, MethodWrap, ObjectWrap } from './nodes.js'
import { normalizeTypeName } from '../abi.js'
import { MethodKind, TypeNode } from '../abi/types.js'
import { getTypeBytes } from '../vm/memory.js'

/**
 * Writes a function exported from the entry module that simply calls the
 * same function on the given Object.
 * 
 * For instance methods, an extra argument is added for the instance Ptr.
 */
export function writeExportedMethod(method: MethodWrap, obj: ObjectWrap): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const separator = isInstance ? '$' : '_'
  const args = method.args.map((f, i) => `a${i}: ${normalizeTypeName(f.type)}`)
  const rtype = isConstructor ? obj.name : normalizeTypeName(method.rtype)
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
 * Writes function declarations for interfacing with imported jigs.
 */
export function writeProxyImports(ctx: TransformCtx) {
  const code = `
  @external("vm", "vm_call")
  declare function vm_call<T>(klass: string, origin: ArrayBuffer, fn: string, argBuf: ArrayBuffer): T

  @external("vm", "vm_prop")
  declare function vm_prop<T>(klass: string, origin: ArrayBuffer, prop: string): T
  `.trim()

  const src = ctx.parse(code, ctx.entry.normalizedPath)
  ctx.entry.statements.unshift(...src.statements)
}

/**
 * Writes a proxy class wrapper for the specific Class, around the given member
 * strings.
 */
export function writeProxyClass(obj: ObjectWrap, members: string[]): string {
  return `
  class ${obj.name} {
    origin: ArrayBuffer;
    ${ members.join('\n') }
  }
  `
}

/**
 * Writes a getter on a proxy class. Returns the result of `vm_prop`.
 */
export function writeProxyGetter(field: FieldWrap, obj: ObjectWrap): string {
  const klass = obj.decorators.find(n => n.name === 'imported')?.args[0]
  return `
  get ${field.name}(): ${field.type.name} {
    return vm_prop<${field.type.name}>('${klass}', this.origin, '${obj.name}.${field.name}')
  }
  `.trim()
}

/**
 * Writes a method on a proxy class. Returns the result of `vm_call`.
 */
export function writeProxyMethod(method: MethodWrap, obj: ObjectWrap): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const separator = isInstance ? '$' : '_'
  const klass = obj.decorators.find(n => n.name === 'imported')?.args[0]
  const args = method.args.map((f, i) => `a${i}: ${f.type.name}`)
  const rtype = isConstructor ? 'ArrayBuffer' : method.rtype?.name
  const prefix = isConstructor ? 'this.origin =' : 'return'

  return `
  ${method.name}(${args.join(', ')})${isConstructor ? '' : `: ${rtype}`} {
    ${ writeArgWriter(method.args as FieldWrap[]) }
    ${prefix} vm_call<${rtype}>('${klass}', this.origin, '${obj.name}${separator}${method.name}', args.buffer)
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
