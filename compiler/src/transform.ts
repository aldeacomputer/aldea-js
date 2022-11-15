import {
  BlockStatement,
  ClassDeclaration,
  CommonFlags,
  Parser,
  Program,
  Statement,
} from 'assemblyscript'

import { FieldKind, MethodKind, MethodNode } from './abi/types.js'
import { TransformCtx } from './transform/ctx.js'
import { FieldWrap, MethodWrap, ObjectWrap } from './transform/nodes.js'
import { isPrivate, isProtected } from './transform/filters.js'

import {
  writeConstructor,
  writeConstructorHook,
  writeExportedMethod,
  writeLocalProxyClass,
  writeLocalProxyMethod,
  writeRemoteProxyClass,
  writeRemoteProxyGetter,
  writeRemoteProxyMethod,
  writeMapPutter,
  writeSetPutter,
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

  $ctx.exportedObjects.forEach(obj => {
    addConstructorHook(obj, $ctx)
    createProxyMethods(obj, $ctx)
    exportClassMethods(obj, $ctx)
    // Remove the export flag
    obj.node.flags = obj.node.flags & ~CommonFlags.EXPORT
  })

  $ctx.importedObjects.forEach(obj => {
    createProxyClass(obj, $ctx)
    // Remove user node
    const source = obj.node.range.source
    const idx = source.statements.indexOf(obj.node as Statement)
    if (idx > -1) { source.statements.splice(idx, 1) }
  })

  exportComplexSetters($ctx)
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
 * - Adds a constructor if one not defined on objject.
 */
function exportClassMethods(obj: ObjectWrap, ctx: TransformCtx): void {
  const codes = (obj.methods as MethodWrap[])
    .filter(n => !isPrivate(n.node.flags) && !isProtected(n.node.flags))
    .reduce((acc: string[], n: MethodWrap): string[] => {
      acc.push(writeExportedMethod(n, obj))
      return acc
    }, [])
  
  // If no constructor is defined then add a default
  if (obj.methods.every(n => n.kind !== MethodKind.CONSTRUCTOR)) {
    const n: MethodNode = {
      kind: MethodKind.CONSTRUCTOR,
      name: 'constructor',
      args: [],
      rtype: null
    }
    codes.unshift(writeExportedMethod(n as MethodWrap, obj))
  }

  const source = obj.node.range.source
  const src = ctx.parse(codes.join('\n'), source.normalizedPath)
  source.statements.push(...src.statements)
}

/**
 * Adds a VM hook to the object's constructor
 * 
 * - Inserts it at end of defined constructor
 * - Or creates a default constructor if one not defined
 */
function addConstructorHook(obj: ObjectWrap, ctx: TransformCtx): void {
  const source = obj.node.range.source
  const method = obj.methods.find(n => n.kind === MethodKind.CONSTRUCTOR)
  if (method) {
    const code = writeConstructorHook(obj)
    const src = ctx.parse(code, source.normalizedPath)
    ;(<BlockStatement>method.node.body).statements.push(...src.statements)
  } else {
    const code = writeLocalProxyClass(obj, [
      writeConstructor(obj)
    ])
    const src = ctx.parse(code, source.normalizedPath)
    const members = (src.statements[0] as ClassDeclaration).members
    obj.node.members.push(...members)
  }
}

/**
 * Create proxy method for each class instance method.
 * 
 * - prefix original method with underscore
 * - add proxy method that wraps the original method, letting vm know of stack
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

  const src = ctx.parse(code, obj.node.range.source.normalizedPath)
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

  const source = obj.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  source.statements.push(...src.statements)
}

/**
 * Create internal putter methods for any complex types.
 */
function exportComplexSetters(ctx: TransformCtx): void {
  const codes: string[] = []

  ctx.exposedTypes.forEach(type => {
    if (type.name === 'Map') { codes.push(writeMapPutter(type)) }
    if (type.name === 'Set') { codes.push(writeSetPutter(type)) }
  })

  if (codes.length) {
    const src = ctx.parse(codes.join('\n'), ctx.entry.normalizedPath)
    ctx.entry.statements.push(...src.statements)
  }
}