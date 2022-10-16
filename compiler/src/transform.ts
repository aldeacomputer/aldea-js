import {
  ASTBuilder,
  ClassDeclaration,
  CommonFlags,
  Parser,
  Program,
  Statement,
} from 'assemblyscript'

import { FieldKind, MethodKind } from './abi/types.js'
import { TransformCtx } from './transform/ctx.js'
import { FieldWrap, MethodWrap, ObjectWrap } from './transform/nodes.js'

import {
  writeExportedMethod,
  writeLocalProxyClass,
  writeLocalProxyMethod,
  writeRemoteProxyClass,
  writeRemoteProxyGetter,
  writeRemoteProxyMethod,
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

  injectJigNamesToAuth($ctx)

  $ctx.importedObjects.forEach(obj => {
    createProxyClass(obj, $ctx)
    // Remove user node
    const idx = $ctx.entry.statements.indexOf(obj.node as Statement)
    if (idx > -1) { $ctx.entry.statements.splice(idx, 1) }
  })

  $ctx.exportedObjects.forEach(obj => {
    createProxyMethods(obj, $ctx)
    exportClassMethods(obj, $ctx)
    // Prefix class name with underscore and remove the export flag
    obj.node.flags = obj.node.flags & ~CommonFlags.EXPORT
  })

  console.log('»»» TRANSFORMED «««')
  console.log('*******************')
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
 * Injects code that pushes exported and imported jig names to the Auth module.
 */
function injectJigNamesToAuth(ctx: TransformCtx): void {
  const auth = ctx.parser.sources.find(s => s.normalizedPath === '~lib/aldea/auth.ts')
  if (auth) {
    const exportedCode = ctx.exportedObjects.map(obj => `EXPORTED_JIGS.push('${obj.name}')`).join('\n')
    const importedCode = ctx.importedObjects.map(obj => `IMPORTED_JIGS.push('${obj.name}')`).join('\n')
    const src = ctx.parse(`${exportedCode}\n${importedCode}`, auth.normalizedPath)
    auth.statements.push(...src.statements)
  } else {
    throw new Error('could not find auth api source')
  }
}

/**
 * Transform exported object.
 * 
 * - Writes exported method for each public method of the object.
 */
function exportClassMethods(obj: ObjectWrap, ctx: TransformCtx): void {
  const codes = (obj.methods as MethodWrap[])
    .reduce((acc: string[], n: MethodWrap): string[] => {
      acc.push(writeExportedMethod(n, obj))
      return acc
    }, [])

  const src = ctx.parse(codes.join('\n'), ctx.entry.normalizedPath)
  ctx.entry.statements.push(...src.statements)
}

/**
 * TODO
 */
function createProxyMethods(obj: ObjectWrap, ctx: TransformCtx): void {
  const methodCodes = (obj.methods as MethodWrap[])
    .filter(n => n.kind === MethodKind.INSTANCE)
    .reduce((acc: string[], n: MethodWrap): string[] => {
      n.node.name.text = `_${n.node.name.text}`
      acc.push(writeLocalProxyMethod(n, obj))
      return acc
    }, [])

  const code = writeLocalProxyClass(obj, [
    methodCodes.join('\n')
  ])

  const src = ctx.parse(code, ctx.entry.normalizedPath)
  const members = (src.statements[0] as ClassDeclaration).members
  obj.node.members.push(...members)
}

/**
 * Transform imported object.
 * 
 * - Creates a proxy class for the imported object
 * - Adds proxy methods for each declared property and method
 * - Removes the user declared code
 */
function createProxyClass(obj: ObjectWrap, ctx: TransformCtx): void {
  const fieldCodes = (obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC)
    .reduce((acc: string[], n: FieldWrap): string[] => {
      acc.push(writeRemoteProxyGetter(n, obj))
      return acc
    }, [])

  const methodCodes = (obj.methods as MethodWrap[])
    .reduce((acc: string[], n: MethodWrap): string[] => {
      acc.push(writeRemoteProxyMethod(n, obj))
      return acc
    }, [])

  const code = writeRemoteProxyClass(obj, [
    fieldCodes.join('\n'),
    methodCodes.join('\n')
  ])

  const src = ctx.parse(code, ctx.entry.normalizedPath)
  ctx.entry.statements.push(...src.statements)
}
