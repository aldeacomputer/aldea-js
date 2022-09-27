import {
  ASTBuilder,
  Class,
  CommonFlags,
  Module,
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
  console.log('IMPORTED', obj.name)
  const fieldCodes = (obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC)
    .reduce((acc: string[], n: FieldWrap): string[] => {
      acc.push(writeProxyGetter(n, obj))
      return acc
    }, [])

  //const methodCodes = (obj.methods as MethodWrap[])
  //  .reduce((acc: string[], n: MethodWrap): string[] => {
  //    acc.push(writeProxyMethod(n, obj))
  //    return acc
  //  }, [])

  // Not yet implemented
  const code = `
  class ${obj.name} {
    origin: ArrayBuffer;
    ${ fieldCodes.join('\n') }
  }
  `.trim()
  //writeProxyClassWrapper(obj, [
  //  fieldCodes.join('\n'),
  //  methodCodes.join('\n')
  //])

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
  //@external("vm", "vm_call")
  //declare function vm_call(origin: string, fn: string, argBuf: Uint8Array): Uint8Array

  @external("vm", "vm_prop")
  declare function vm_prop<T>(klass: string, origin: ArrayBuffer, prop: string): T
  `.trim()

  const src = ctx.parse(code, ctx.entry.normalizedPath)
  ctx.entry.statements.unshift(...src.statements)
}

function writeProxyGetter(field: FieldWrap, obj: ObjectWrap): string {
  const klass = obj.decorators.find(d => d.name === 'imported')?.args[0]
  return `
  get ${field.name}(): ${field.type.name} {
    //const args = new ArrayBuffer(4)
    //const view = new DataView(args)
    //view.setUint32(0, changetype<usize>(this.origin))
    return vm_prop<${field.type.name}>('${klass}', this.origin, '${obj.name}.${field.name}')
  }
  `.trim()
}