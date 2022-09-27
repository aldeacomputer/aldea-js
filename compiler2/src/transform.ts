import {
  ASTBuilder,
  CommonFlags,
  Parser,
  Program,
  Statement,
} from 'assemblyscript'

import {
  FieldKind,
  MethodKind
} from './abi/types.js'

import { TransformCtx } from './transform/ctx.js'
import { FieldWrap, MethodWrap, ObjectWrap } from './transform/nodes.js'
import { getTypeBytes } from './vm/memory.js'

// Set global scope
let $ctx: TransformCtx

/**
 * Hook to access the current Transform Context.
 */
export function useCtx(): TransformCtx { return $ctx }

/**
 * Called when parsing is complete, and the AST is ready.
 */
export function afterParse(parser: Parser): void {
  $ctx = new TransformCtx(parser)

  console.log('   == ORIGINAL ==   ')
  console.log('********************')
  console.log(ASTBuilder.build($ctx.entry))

  if ($ctx.importedObjects.length) { writeProxyImports($ctx) }
  $ctx.exportedObjects.forEach(n => transformExports(n, $ctx))
  $ctx.importedObjects.forEach(n => transformImports(n, $ctx))

  console.log('  == TRANSFORMED == ')
  console.log('********************')
  console.log(ASTBuilder.build($ctx.entry))
}

export function afterInitialize(program: Program): void {
  $ctx.program = program
}

/**
 * Transform exported object.
 * 
 * - Writes exported method for each public method of the object.
 */
function transformExports(obj: ObjectWrap, ctx: TransformCtx): void {
  const codes = (obj.methods as MethodWrap[])
    .reduce((acc: string[], n: MethodWrap): string[] => {
      acc.push(writeExportedMethod(n, obj))
      return acc
    }, [])

  // Remove the class export
  obj.node.flags = obj.node.flags & ~CommonFlags.EXPORT

  const src = ctx.parse(codes.join('\n'), ctx.entry.normalizedPath)
  ctx.entry.statements.push(...src.statements)
}



function transformImports(obj: ObjectWrap, ctx: TransformCtx): void {
  const fieldCodes = (obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC)
    .reduce((acc: string[], n: FieldWrap): string[] => {
      acc.push(writeProxyGetter(n, obj))
      return acc
    }, [])

  const methodCodes = (obj.methods as MethodWrap[])
    .reduce((acc: string[], n: MethodWrap): string[] => {
      acc.push(writeProxyMethod(n, obj))
      return acc
    }, [])

  const code = writeProxyClass(obj, [
    fieldCodes.join('\n'),
    methodCodes.join('\n')
  ])

  // Remove user node
  const idx = ctx.entry.statements.indexOf(obj.node as Statement)
  if (idx > -1) { ctx.entry.statements.splice(idx, 1) }

  const src = ctx.parse(code, ctx.entry.normalizedPath)
  ctx.entry.statements.push(...src.statements)
}


// Helpers

function writeExportedMethod(method: MethodWrap, obj: ObjectWrap): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const separator = isInstance ? '$' : '_'
  const args = method.args.map((f, i) => `a${i}: ${f.type.name}`)
  const rtype = isConstructor ? obj.name : method.rtype?.name
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

function writeProxyImports(ctx: TransformCtx) {
  const code = `
  @external("vm", "vm_call")
  declare function vm_call<T>(klass: string, origin: ArrayBuffer, fn: string, argBuf: ArrayBuffer): T

  @external("vm", "vm_prop")
  declare function vm_prop<T>(klass: string, origin: ArrayBuffer, prop: string): T
  `.trim()

  const src = ctx.parse(code, ctx.entry.normalizedPath)
  ctx.entry.statements.unshift(...src.statements)
}

function writeProxyClass(obj: ObjectWrap, chunks: string[]): string {
  return `
  class ${obj.name} {
    origin: ArrayBuffer;
    ${ chunks.join('\n') }
  }
  `
}

function writeProxyGetter(field: FieldWrap, obj: ObjectWrap): string {
  const klass = obj.decorators.find(n => n.name === 'imported')?.args[0]
  return `
  get ${field.name}(): ${field.type.name} {
    return vm_prop<${field.type.name}>('${klass}', this.origin, '${obj.name}.${field.name}')
  }
  `.trim()
}

function writeProxyMethod(method: MethodWrap, obj: ObjectWrap): string {
  const isConstructor = method.kind === MethodKind.CONSTRUCTOR
  const isInstance = method.kind === MethodKind.INSTANCE
  const separator = isInstance ? '$' : '_'
  const klass = obj.decorators.find(n => n.name === 'imported')?.args[0]
  const args = method.args.map((f, i) => `a${i}: ${f.type.name}`)

  return `
  ${method.name}(${args.join(', ')}): ${method.rtype!.name} {
    ${ writeArgWriter(method.args as FieldWrap[]) }
    return vm_call<${method.rtype!.name}>('${klass}', this.origin, '${obj.name}${separator}${method.name}', args.buffer)
  }
  `.trim()
}

function writeArgWriter(fields: FieldWrap[]): string {
  const bytes = fields.reduce((sum, n) => sum + getTypeBytes(n.type), 0)
  const chunks = fields.map((n, i) => `args.${ writeArgWriterEncodeMethod(n, i) }`)
  return `
  const args = new ArgWriter(${bytes})
  ${ chunks.join('\n') }
  `.trim()
}

function writeArgWriterEncodeMethod(field: FieldWrap, i: number): string {
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