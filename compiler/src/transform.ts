import {
  ASTBuilder,
  ClassDeclaration,
  CommonFlags,
  FunctionDeclaration,
  IdentifierExpression,
  InstanceOfExpression,
  MethodDeclaration,
  Module,
  NamedTypeNode,
  NewExpression,
  Node,
  NodeKind,
  Parser,
  Program,
  PropertyAccessExpression,
  Statement,
  Source,
} from 'assemblyscript'

import { abiToCbor, abiToJson } from './abi.js'
import { CodeKind, FieldKind, MethodKind, TypeNode } from './abi/types.js'
import { TransformCtx } from './transform/ctx.js'
import { createDocs } from './transform/docs.js'
import { ClassWrap, FieldWrap, FunctionWrap, InterfaceWrap, MethodWrap } from './transform/nodes.js'
import { filterAST } from './transform/filters.js'

import {
  writeClass,
  writeJigInterface,
  writeJigLocalClass,
  writeJigRemoteClass,
  writeExportedFunction,
  writeInterfaceRemoteClass,
  writeImportedRemoteClass,
  writeImportedRemoteFunction,
  writeMapSetter,
  writeSetSetter,
} from './transform/code-helpers.js'

/**
 * Assemblyscript Transform Interface
 */
export interface AscTransform {
  $ctx?: TransformCtx;
  baseDir: string;
  log(line: string): void;
  writeFile(filename: string, contents: string | Uint8Array, baseDir: string): void | Promise<void>;
  afterParse?(parser: Parser): void;
  afterInitialize?(program: Program): void;
  afterCompile?(module: Module): void;
}

// Parent node type (has one or more keys containing a node or nodes)
type ParentNode = {[key: string]: Node | Node[]}

/**
 * Aldea Transform class. This is where all the magic happens.
 */
export class Transform implements Omit<AscTransform, 'baseDir' | 'log' | 'writeFile'> {
  $ctx?: TransformCtx;

  /**
   * Called when parsing is complete, and the AST is ready.
   */
  afterParse(parser: Parser): void {
    const $ctx = new TransformCtx(parser)
    this.$ctx = $ctx

    // 1 - apply necessary transformations to each export
    $ctx.exports.forEach(ex => {
      switch (ex.kind) {
        case CodeKind.CLASS:
          ensureJigConstructor(ex.code as ClassWrap, $ctx)
          //insertParentMethods(ex.code as ClassWrap, $ctx) /- to debate if this is needed
          jigToInterface(ex.code as ClassWrap, $ctx)
          jigToRemoteClass(ex.code as ClassWrap, $ctx)
          jigToLocalClass(ex.code as ClassWrap, $ctx)
          jigToExportedFunctions(ex.code as ClassWrap, $ctx)
          break
        case CodeKind.FUNCTION:
          break
        case CodeKind.INTERFACE:
          interfaceToRemoteClass(ex.code as InterfaceWrap, $ctx)
          interfaceSanitize(ex.code as InterfaceWrap)
          break
      }
    })

    // 2 - apply necessary transformations to each import
    $ctx.imports.forEach(im => {
      switch (im.kind) {
        case CodeKind.CLASS:
          importToRemoteClass(im.code as ClassWrap, $ctx, im.pkg)
          dropNode(im.code.node)
          break
        case CodeKind.FUNCTION:
          importToRemoteFunction(im.code as FunctionWrap, $ctx, im.pkg)
          dropNode(im.code.node)
          break
        case CodeKind.INTERFACE:
          interfaceToRemoteClass(im.code as InterfaceWrap, $ctx)
          break
      }
    })

    // 3 - inject complex setters
    complexTypeSetters($ctx)

    // 4 - filter through the AST and apply necessary mutations
    $ctx.sources.forEach(src => {
      filterAST(src, (node: Node, parent?: Node, parentProp?: string) => {
        switch (node.kind) {
          // Check property access on Jig classes
          // Static calls should be on the LocalJig class
          case NodeKind.PropertyAccess:
            const accessTypeName = ((<PropertyAccessExpression>node).expression as IdentifierExpression).text
            if (isExportedJig(accessTypeName, node.range.source, $ctx)) {
              mutateJigPropertyAccess(node as PropertyAccessExpression)
            }
            break

          // Check instanceof expressions on Jig classes
          // Mutate it to instanceof LocalJig || instanceof RemoteJig
          case NodeKind.InstanceOf:
            const instanceOfTypeName = ((<InstanceOfExpression>node).isType as NamedTypeNode).name.identifier.text
            if (isExportedJig(instanceOfTypeName, node.range.source, $ctx) && parent && parentProp && parentProp in parent) {
              mutateInstanceOfJig(node as InstanceOfExpression, parent as unknown as ParentNode, parentProp, $ctx)
            }
            break

          // Check new expressions on Jig classes
          // New calls should be on the RemoteJig class
          case NodeKind.New:
            const newTypeName = (<NewExpression>node).typeName.identifier.text
            if (isExportedJig(newTypeName, node.range.source, $ctx)) {
              mutateNewJigExpression(node as NewExpression)
            }
            break
        }
      })
    })
  }

  /**
   * Called once the program is initialized, before it is being compiled.
   * 
   * We simply attach the program to the Transform Context so we can use it later.
   */
  afterInitialize(program: Program): void {
    if (this.$ctx) this.$ctx.program = program
  }

  /**
   * Called with the resulting module before it is being emitted.
   * 
   * We write the ABI files here and log the transformed code to sdtout
   */
  async afterCompile(this: AscTransform, _module: Module): Promise<void> {
    if (this.$ctx) {
      await this.writeFile('abi.cbor', new Uint8Array(abiToCbor(this.$ctx.abi)), this.baseDir)
      await this.writeFile('abi.json', abiToJson(this.$ctx.abi, 2), this.baseDir)
      await this.writeFile('docs.json', JSON.stringify(createDocs(this.$ctx), null, 2), this.baseDir)
      this.log('»»» TRANSFORMED «««')
      this.log('*******************')
      this.$ctx.entries.forEach(entry => { this.log(ASTBuilder.build(entry)) })
    }
  }
}


// --
// JIG TRANSFORMATIONS
// --

/**
 * Ensures a constructor exists (if not, it adds one to the code and the ABI).
 */
function ensureJigConstructor(obj: ClassWrap, ctx: TransformCtx): void {
  // First ensure a constructor exists
  if (!obj.methods.find(n => n.kind === MethodKind.CONSTRUCTOR)) {
    const source = obj.node.range.source
    const code = writeClass(obj)
    const src = ctx.parse(code, source.normalizedPath)
    const node = (src.statements[0] as ClassDeclaration).members[0] as MethodDeclaration
    const idx = Math.max(0, source.statements.findIndex(n => n.kind === NodeKind.MethodDeclaration))

    // insert compiled code and constructor into transform ctx
    obj.node.members.splice(idx, 0, node)
    obj.methods.unshift({
      node,
      kind: MethodKind.CONSTRUCTOR,
      name: 'constructor',
      args: [],
      rtype: null
    } as MethodWrap)
  }
}

/**
 * Transforms the given jig class to an interface.
 */
function jigToInterface(obj: ClassWrap, ctx: TransformCtx): void {
  const parents = collectParents(CodeKind.CLASS, obj.extends, ctx)
  const parentFields = parents.flatMap(p => p.fields.map(n => n.name) as string[])
  const parentMethods = parents.flatMap(p => p.methods.map(n => n.name) as string[])

  const fields = (obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC && !parentFields.includes(n.name))

  const methods = (obj.methods as MethodWrap[])
    .filter(n => n.kind === MethodKind.INSTANCE && !parentMethods.includes(n.name))

  const code = writeJigInterface(obj, fields, methods)

  const source = obj.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  const idx = source.statements.indexOf(obj.node as Statement)
  source.statements.splice(idx, 0, ...src.statements)
}

/**
 * Transforms the given Jig class to a remote class implementation of the Jig's
 * interface.
 */
function jigToRemoteClass(obj: ClassWrap, ctx: TransformCtx): void {
  const fields = (obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC)

  const methods = (obj.methods as MethodWrap[])
    .filter(n => n.kind === MethodKind.CONSTRUCTOR || n.kind === MethodKind.INSTANCE)

  const code = writeJigRemoteClass(obj, fields, methods)
  const source = obj.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  const idx = source.statements.indexOf(obj.node as Statement)
  source.statements.splice(idx+1, 0, ...src.statements)
}

/**
 * Transforms the given Jig class to a local class implementation of the Jig's
 * interface.
 * 
 * In this case, as the code is already written by the user, we simply write
 * a class declalration with no body, add the existing AST nodes to the new
 * class node, and replace the original class.
 */
function jigToLocalClass(obj: ClassWrap, ctx: TransformCtx): void {
  const code = writeJigLocalClass(obj)

  const source = obj.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  // add origin members into new class
  ;(<ClassDeclaration>src.statements[0]).members = obj.node.members
  // replace old with new class
  const idx = source.statements.indexOf(obj.node as Statement)
  source.statements.splice(idx, 1, ...src.statements)
}

/**
 * Transforms the given Jig class into exported functions for each public
 * method.
 */
function jigToExportedFunctions(obj: ClassWrap, ctx: TransformCtx): void {
  const codes = (obj.methods as MethodWrap[])
    .filter(n => n.kind !== MethodKind.PRIVATE && n.kind !== MethodKind.PROTECTED)
    .reduce((acc: string[], n: MethodWrap): string[] => {
      acc.push(writeExportedFunction(n, obj))
      return acc
    }, [])

  const source = obj.node.range.source
  const src = ctx.parse(codes.join('\n'), source.normalizedPath)
  source.statements.push(...src.statements)
}


// --
// INTERFACE TRANSFORMATIONS
// --

/**
 * Transforms the given Interface to a remote class implementation.
 */
function interfaceToRemoteClass(obj: InterfaceWrap, ctx: TransformCtx): void {
  const parents = collectParents(CodeKind.INTERFACE, obj.extends, ctx)

  const fields = parents.flatMap(n => n.fields as FieldWrap[])
    .concat(...obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC)

  const methods = parents.flatMap(n => n.methods as MethodWrap[])
    .concat(...(obj.methods as MethodWrap[]))
    .filter(n => n.kind === MethodKind.INSTANCE)

  const code = writeInterfaceRemoteClass(obj, fields, methods)
  const source = obj.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  source.statements.push(...src.statements)
}

/**
 * Removes export flag from the interface node.
 */
function interfaceSanitize(obj: InterfaceWrap): void {
  obj.node.flags = obj.node.flags & ~CommonFlags.Export
}


// --
// IMPORT TRANSFORMATION
// --

/**
 * Transforms the given Import class to a remote class implementation.
 */
function importToRemoteClass(obj: ClassWrap, ctx: TransformCtx, pkg: string): void {
  const fields = (obj.fields as FieldWrap[])
    .filter(n => n.kind === FieldKind.PUBLIC)

  const methods = (obj.methods as MethodWrap[])
    .filter(n => n.kind !== MethodKind.PRIVATE && n.kind !== MethodKind.PROTECTED)

  const code = writeImportedRemoteClass(obj, fields, methods, pkg)
  const source = obj.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  source.statements.push(...src.statements)
}

/**
 * Transforms the given Import class to a remote function implementation.
 */
function importToRemoteFunction(fn: FunctionWrap, ctx: TransformCtx, pkg: string): void {
  const code = writeImportedRemoteFunction(fn, pkg)
  const source = fn.node.range.source
  const src = ctx.parse(code, source.normalizedPath)
  source.statements.push(...src.statements)
}


// --
// AST MUTATIONS
// --

/**
 * Removes the given AST node from the source.
 */
function dropNode(node: ClassDeclaration | FunctionDeclaration): void {
  const source = node.range.source
  const idx = source.statements.indexOf(node as Statement)
  if (idx > -1) { source.statements.splice(idx, 1) }
}

/**
 * Inserts complex setter functions for any complex types (maps and sets).
 */
function complexTypeSetters(ctx: TransformCtx): void {
  const codes: string[] = []

  function pushComplexSetters(type: TypeNode) {
    if (type.name === 'Map') { codes.push(writeMapSetter(type)) }
    if (type.name === 'Set') { codes.push(writeSetSetter(type)) }
    type.args.forEach(pushComplexSetters)
  }

  ctx.exposedTypes.forEach(pushComplexSetters)

  if (codes.length) {
    const src = ctx.parse(
      codes.filter((v, i, a) => a.indexOf(v) === i).join('\n'),
      ctx.entries[0].normalizedPath
    )
    ctx.entries[0].statements.push(...src.statements)
  }
}

/**
 * Mutates static property access expressions on Jig classes to use LocalClass.
 */
function mutateJigPropertyAccess(node: PropertyAccessExpression): void {
  const id = node.expression as IdentifierExpression
  id.text = `_Local${id.text}`
}

/**
 * Mutates instanceof expressions on Jig classes to use LocalClass.
 */
function mutateInstanceOfJig(
  node: InstanceOfExpression,
  parent: ParentNode,
  prop: string,
  ctx: TransformCtx
): void {
  const varName = (<IdentifierExpression>node.expression).text
  const jigName = (<NamedTypeNode>node.isType).name.identifier.text

  const code = `(${varName} instanceof _Local${jigName} || ${varName} instanceof _Remote${jigName})`
  const src = ctx.parse(code, node.range.source.normalizedPath)
  // @ts-ignore
  const exp = src.statements[0].expression

  if (Array.isArray(parent[prop])) {
    const idx = (parent[prop] as Node[]).indexOf(node)
    ;(parent[prop] as Node[]).splice(idx, 1, exp)
  } else {
    parent[prop] = exp
  }
}

/**
 * Mutates new expressions on Jig classes to use LocalClass.
 */
function mutateNewJigExpression(node: NewExpression): void {
  const id = node.typeName.identifier as IdentifierExpression
  id.text = `_Remote${id.text}`
}


// --
// HELPERS
// --

/**
 * Returns true if the given class name is exported from the specified source.
 */
function isExportedJig(name: string, source: Source, ctx: TransformCtx): boolean {
  return ctx.exports.some(ex => {
    return ex.kind === CodeKind.CLASS &&
      ex.code.name === name &&
      (<ClassWrap>ex.code).node.range.source.normalizedPath == source.normalizedPath
  })
}

/**
 * Collects all parent nodes for the given class or interface name.
 */
function collectParents(kind: CodeKind, name: string | null, ctx: TransformCtx): Array<ClassWrap | InterfaceWrap> {
  const parents: Array<ClassWrap | InterfaceWrap> = []
  let parent = findParent(kind, name, ctx)
  while (parent) {
    parents.unshift(parent)
    parent = findParent(kind, parent.extends, ctx)
  }
  return parents
}

/**
 * Finds the parent class or interface node by the given name.
 */
function findParent(kind: CodeKind, name: string | null, ctx: TransformCtx): ClassWrap | InterfaceWrap | undefined {
  if (!name) return
  return (
    ctx.exports.find(ex => ex.kind === kind && ex.code.name === name) ||
    ctx.imports.find(im => im.kind === kind && im.code.name === name)
  )?.code as ClassWrap | InterfaceWrap
}