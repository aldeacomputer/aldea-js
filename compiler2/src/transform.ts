import {
  ASTBuilder,
  CommonFlags,
  Parser,
} from 'assemblyscript'

import { MethodKind } from './abi/types.js'
import { TransformCtx } from './transform/ctx.js'
import { MethodWrap, ObjectWrap } from './transform/nodes.js'

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

  $ctx.exportedObjects.forEach(n => transformExports(n, $ctx))

  console.log('  == TRANSFORMED == ')
  console.log('********************')
  console.log(ASTBuilder.build($ctx.entry))
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
