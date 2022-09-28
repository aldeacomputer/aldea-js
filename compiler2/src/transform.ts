import {
  ASTBuilder,
  CommonFlags,
  Parser,
  Program,
  Statement,
} from 'assemblyscript'

import { FieldKind } from './abi/types.js'
import { TransformCtx } from './transform/ctx.js'
import { FieldWrap, MethodWrap, ObjectWrap } from './transform/nodes.js'

import {
  writeExportedMethod,
  writeProxyImports,
  writeProxyClass,
  writeProxyGetter,
  writeProxyMethod,
} from './transform/code-helpers.js'


// Set global scope for ctx - meh, does the job
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
  $ctx.exportedObjects.forEach(n => transformExportedObject(n, $ctx))
  $ctx.importedObjects.forEach(n => transformImportedObject(n, $ctx))

  console.log('  == TRANSFORMED == ')
  console.log('********************')
  console.log(ASTBuilder.build($ctx.entry))
}

/**
 * Called once the program is initialized, before it is being compiled.
 * 
 * We simply attach the program to the Transform Context so we can use it later.
 */
export function afterInitialize(program: Program): void {
  $ctx.program = program
}

/**
 * Transform exported object.
 * 
 * - Writes exported method for each public method of the object.
 */
function transformExportedObject(obj: ObjectWrap, ctx: TransformCtx): void {
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

/**
 * Transform imported object.
 * 
 * - Creates a proxy class for the imported object
 * - Adds proxy methods for each declared property and method
 * - Removes the user declared code
 */
function transformImportedObject(obj: ObjectWrap, ctx: TransformCtx): void {
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
