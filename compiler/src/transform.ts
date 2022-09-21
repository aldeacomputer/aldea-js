import {
  ASTBuilder,
  ClassDeclaration,
  CommonFlags,
  Parser,
  Statement,
} from 'assemblyscript'

import {
  writeClassWrapper,
  writeDeserializeStaticMethod,
  writeSerializeInstanceMethod,
  writeExportMethod,
  writeExportSchemaMethod,
  writeExportDeserializeMethod,
  writeExportSerializeMethod,
  writeProxyClassWrapper,
  writeProxyGetter,
  writeProxyMethod
} from './transform/code-writer.js'

import { TransformCtx } from './transform/context.js'
import { ClassNode, FieldNode, MethodNode } from './transform/nodes.js'


/**
 * Called when parsing is complete, and the AST is ready.
 */
export function afterParse(parser: Parser): void {
  const ctx = new TransformCtx(parser)

  console.log('\n   == ORIGINAL ==   ')
  console.log('********************')
  console.log(ASTBuilder.build(ctx.src))

  if (ctx.externalClasses.length) { transformImports(ctx) }
  ctx.complexClasses.forEach(n => transformComplexObj(n, ctx))
  ctx.jigClasses.forEach(n => transformJigObj(n, ctx))
  ctx.externalClasses.forEach(n => transformExternalObj(n, ctx))

  console.log('\n  == TRANSFORMED == ')
  console.log('********************')
  console.log(ASTBuilder.build(ctx.src))
}


/**
 * Declares imported functions for interfacing with external jigs.
 * 
 * - Adds vm_call() imported function
 * - Adds vm_prop() imported function
 */
function transformImports(ctx: TransformCtx) {
  const code = `
  @external("vm", "vm_call")
  declare function vm_call(origin: string, fn: string, argBuf: Uint8Array): Uint8Array

  @external("vm", "vm_prop")
  declare function vm_prop(origin: string, fn: string, argBuf: Uint8Array): Uint8Array
  `.trim()

  const src = ctx.parse(code)
  ctx.src.statements.unshift(...src.statements)
}


/**
 * Transforms complex objects.
 * 
 * - Adds #deserialize() method to the class
 * - Adds .serialize() method to the class
 */
function transformComplexObj(obj: ClassNode, ctx: TransformCtx): void {
  console.log(obj.name, 'Adding #deserialize() and .serialize()')
  const code = writeClassWrapper(obj, [
    writeDeserializeStaticMethod(obj),
    writeSerializeInstanceMethod(obj)
  ])

  const src = ctx.parse(code)
  const members = (src.statements[0] as ClassDeclaration).members
  obj.node.members.push(...members)
}


/**
 * Transforms jig objects.
 * 
 * - Exports method for each public static or instance method
 * - Exports deserialize() method
 * - Exports serialize() method
 */
function transformJigObj(obj: ClassNode, ctx: TransformCtx): void {
  console.log(obj.name, 'Exporting all methods')
  const codes = obj.methods
    .filter(n => !n.isPrivate && !n.isProtected)
    .reduce((acc: string[], n: MethodNode): string[] => {
      acc.push(writeExportMethod(n, obj))
      return acc
    }, [])

  console.log(obj.name, 'Adding schema, deserialize, and serialize')
  codes.push(writeExportSchemaMethod(obj))
  codes.push(writeExportDeserializeMethod(obj))
  codes.push(writeExportSerializeMethod(obj))

  // Remove the class export
  obj.node.flags = obj.node.flags & ~CommonFlags.EXPORT

  const src = ctx.parse(codes.join('\n'))
  ctx.src.statements.push(...src.statements)
}


/**
 * Transforms external objects.
 * 
 * - Creates a proxy class for the external object
 * - Adds proxy methods for each declared property and method
 * - Removes the user dclared code
 */
function transformExternalObj(obj: ClassNode, ctx: TransformCtx): void {
  console.log(obj.name, 'Creating external obj')

  const fieldCodes = obj.fields
    .filter(n => !n.isPrivate && !n.isProtected)
    .reduce((acc: string[], n: FieldNode): string[] => {
      acc.push(writeProxyGetter(n, obj))
      return acc
    }, [])

  const methodCodes = obj.methods
    .filter(n => !n.isPrivate && !n.isProtected)
    .reduce((acc: string[], n: MethodNode): string[] => {
      acc.push(writeProxyMethod(n, obj))
      return acc
    }, [])

  // Not yet implemented
  const code = writeProxyClassWrapper(obj, [
    fieldCodes.join('\n'),
    methodCodes.join('\n')
  ])

  // Remove user node
  const idx = ctx.src.statements.indexOf(obj.node as Statement)
  if (idx > -1) { ctx.src.statements.splice(idx, 1) }

  const src = ctx.parse(code)
  ctx.src.statements.push(...src.statements)
}
