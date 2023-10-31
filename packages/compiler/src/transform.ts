import {
  ASTBuilder,
  CallExpression,
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
  InterfaceDeclaration,
  SourceKind,
  DeclarationStatement,
  DiagnosticCategory,
} from 'assemblyscript'

import { abiToBin, abiToJson } from '@aldea/core'
import { ClassNode, CodeKind, FunctionNode, InterfaceNode, MethodKind, MethodNode, ObjectNode, TypeNode } from '@aldea/core/abi'
import { CodeNode, ExportEdge, ExportNode, ImportEdge, ImportNode, TransformGraph } from './transform/graph/index.js'
import { createDocs } from './transform/docs.js'
import { filterAST, isConstructor, isProtected, isPublic } from './transform/filters.js'

import {
  writeClass,
  writeJigInterface,
  writeJigLocalClass,
  writeJigRemoteClass,
  writeJigBinding,
  writeObjectClass,
  writeImportStatement,
  writeExportStatement,
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
  $ctx?: TransformGraph;
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
  $ctx?: TransformGraph;

  /**
   * Called when parsing is complete, and the AST is ready.
   */
  afterParse(parser: Parser): void {
    const $ctx = new TransformGraph(parser)
    this.$ctx = $ctx

    // If validation failed, just end now
    if ($ctx.parser.diagnostics.some(d => d.category === DiagnosticCategory.Error)) {
      return
    }

    // 1 - apply necessary transformations to each exported code declaration
    $ctx.exports.forEach(ex => {
      switch (ex.code.abiCodeKind) {
        case CodeKind.CLASS:
          ensureJigConstructor(ex.code as CodeNode<ClassDeclaration>)
          jigToInterface(ex.code as CodeNode<ClassDeclaration>)
          jigToLocalClass(ex.code as CodeNode<ClassDeclaration>)
          jigToRemoteClass(ex.code as CodeNode<ClassDeclaration>)
          jigToBindingFunctions(ex)
          dropDeclaration(ex.code)
          break
        case CodeKind.FUNCTION:
          break
        case CodeKind.INTERFACE:
          interfaceToRemoteClass(ex.code as CodeNode<InterfaceDeclaration>)
          break
        case CodeKind.OBJECT:
          objectToClass(ex.code as CodeNode<ClassDeclaration>)
          dropDeclaration(ex.code)
          break
      }
    })

    // 2 - apply necessary transformations to each import
    $ctx.imports.forEach(im => {
      switch (im.code.abiCodeKind) {
        case CodeKind.CLASS:
          //ensureJigConstructor(im.code as CodeNode<ClassDeclaration>)
          importToRemoteClass(im.code as CodeNode<ClassDeclaration>, im.pkgId!)
          dropDeclaration(im.code)
          break
          case CodeKind.FUNCTION:
          importToRemoteFunction(im.code as CodeNode<FunctionDeclaration>, im.pkgId!)
          dropDeclaration(im.code)
          break
        case CodeKind.INTERFACE:
          interfaceToRemoteClass(im.code as CodeNode<InterfaceDeclaration>)
          break
        case CodeKind.OBJECT:
          objectToClass(im.code as CodeNode<ClassDeclaration>)
          dropDeclaration(im.code)
          break
      }
    })

    // 3 - Normalize export and import statements
    $ctx.sources.forEach(src => {
      src.imports.filter(im => im.node.kind === NodeKind.Import && !/^~lib\//.test(im.internalPath!)).forEach(im => {
        updateImportStatement(im)
      })
      src.exports.filter(ex => ex.node.kind === NodeKind.Export).forEach(ex => {
        if (ex.src.source.sourceKind === SourceKind.UserEntry && !!ex.path) {
          updateEntryExportStatement(ex)
        } else {
          updateExportStatement(ex)
        }
      })
    })

    // 4 - inject complex setters
    complexTypeSetters($ctx)

    // 5 - filter through the AST and apply necessary mutations
    $ctx.sources.forEach(src => {
      filterAST(src.source, (node: Node, parent?: Node, parentProp?: string) => {
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

          // Check method call in case of caller.is
          // Jig type node should be renamed to remote jig name
          case NodeKind.Call:
            if ((<CallExpression>node).expression.kind === NodeKind.PropertyAccess) {
              const accessTypeName = (((<CallExpression>node).expression as PropertyAccessExpression).expression as IdentifierExpression).text
              const propertyName = ((<CallExpression>node).expression as PropertyAccessExpression).property.text
              const typeArgs = (<CallExpression>node).typeArguments
              if (accessTypeName === 'caller' && propertyName === 'is' && typeArgs) {
                mutateJigTypeArg(typeArgs[0] as NamedTypeNode)
              }
            }
            break;
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
      await this.writeFile('abi.bin', abiToBin(this.$ctx.toABI()), this.baseDir)
      await this.writeFile('abi.json', abiToJson(this.$ctx.toABI(), 2), this.baseDir)
      await this.writeFile('docs.json', JSON.stringify(createDocs(this.$ctx), null, 2), this.baseDir)
      this.log('»»» TRANSFORMED «««')
      this.log('*******************')
      this.$ctx.sources.forEach(src => {
        const prefix = src.source.sourceKind === SourceKind.UserEntry ? 'ENTRY>' : '>'
        this.log('')
        this.log(`${prefix} : ${src.source.internalPath}`)
        this.log(ASTBuilder.build(src.source))
      })
    }
  }
}


// --
// JIG TRANSFORMATIONS
// --

/**
 * Ensures a constructor exists (if not, it adds one to the code and the ABI).
 */
function ensureJigConstructor(code: CodeNode<ClassDeclaration>): void {
  const abiNode = code.abiNode as ClassNode
  // ensure a constructor exists
  if (!code.node.members.find(n => n.kind === NodeKind.MethodDeclaration && isConstructor(n.flags))) {
    const source = code.node.range.source
    const ts = writeClass(abiNode)
    const src = code.src.ctx.parse(ts, source.normalizedPath)
    const node = (src.statements[0] as ClassDeclaration).members[0] as MethodDeclaration
    const idx = Math.max(0, source.statements.findIndex(n => n.kind === NodeKind.MethodDeclaration))
    // insert compiled code and constructor into transform ctx
    code.node.members.splice(idx, 0, node)
  }
}

/**
 * Transforms the given jig class to an interface.
 */
function jigToInterface(code: CodeNode<ClassDeclaration>): void {
  const abiNode = code.abiNode as ClassNode
  const parents = code.findAllParents().map(n => n.abiNode as ClassNode)
  const parentFields = parents.flatMap(p => p.fields.map(n => n.name) as string[])
  const parentMethods = parents.flatMap(p => p.methods.map(n => n.name) as string[])

  const fields = abiNode.fields.filter(n => !parentFields.includes(n.name))

  const methods = abiNode.methods.filter(n => {
    return n.kind >= MethodKind.PUBLIC && !parentMethods.includes(n.name)
  })

  const source = code.node.range.source
  const ts = writeJigInterface(abiNode, fields, methods, isExported(code.node))

  const src = code.src.ctx.parse(ts, source.normalizedPath)
  const idx = source.statements.indexOf(code.node as Statement)
  source.statements.splice(idx, 0, ...src.statements)
}

/**
 * Transforms the given Jig class to a local class implementation of the Jig's
 * interface.
 * 
 * In this case, as the code is already written by the user, we simply write
 * a class declalration with no body, add the existing AST nodes to the new
 * class node, and replace the original class.
 */
function jigToLocalClass(code: CodeNode<ClassDeclaration>): void {
  const abiNode = code.abiNode as ClassNode

  const source = code.node.range.source
  const ts = writeJigLocalClass(abiNode, isExported(code.node))
  
  const src = code.src.ctx.parse(ts, source.normalizedPath)
  // add original members into new class with transformations
  // 1 - all fields become public
  // 2 - protected modifer is removed from methods (private is kept)
  ;(<ClassDeclaration>src.statements[0]).members = code.node.members.map(n => {
    n.flags &= ~CommonFlags.Readonly
    n.flags &= ~CommonFlags.Protected
    if (n.kind === NodeKind.FieldDeclaration) {
      n.flags &= ~CommonFlags.Private
      if (!isPublic(n.flags)) { n.flags |= CommonFlags.Public }
    }
    return n
  })
  const idx = source.statements.indexOf(code.node as Statement)
  source.statements.splice(idx+1, 0, ...src.statements)
}

/**
 * Transforms the given Jig class to a remote class implementation of the Jig's
 * interface.
 */
function jigToRemoteClass(code: CodeNode<ClassDeclaration>): void {
  const abiNode = code.abiNode as ClassNode

  const fields = abiNode.fields
  const methods = abiNode.methods //.filter(n => n.kind <= MethodKind.PUBLIC)

  const source = code.node.range.source
  const ts = writeJigRemoteClass(abiNode, fields, methods, isExported(code.node))
  
  const src = code.src.ctx.parse(ts, source.normalizedPath)
  const idx = source.statements.indexOf(code.node as Statement)
  source.statements.splice(idx+2, 0, ...src.statements)
}

/**
 * Transforms the given Jig class into exported functions for each public
 * method.
 */
function jigToBindingFunctions(ex: ExportEdge): void {
  const abiNode = ex.code.abiNode as ClassNode
  const ts = abiNode.methods
    .filter(n => n.kind <= MethodKind.PUBLIC)
    .reduce((acc: string[], n: MethodNode): string[] => {
      acc.push(writeJigBinding(n, abiNode))
      return acc
    }, [])

  const source = ex.ctx.src.source
  const src = ex.ctx.graph.parse(ts.join('\n'), source.normalizedPath)
  source.statements.push(...src.statements)
}

// --
// INTERFACE TRANSFORMATIONS
// --

/**
 * Transforms the given Interface to a remote class implementation.
 */
function interfaceToRemoteClass(code: CodeNode<InterfaceDeclaration>): void {
  const abiNode = code.abiNode as InterfaceNode
  const parents = code.findAllParents().map(n => n.abiNode as InterfaceNode)

  const fields = parents.flatMap(n => n.fields).concat(...abiNode.fields)
  const methods = parents.flatMap(n => n.methods).concat(...abiNode.methods)

  const source = code.node.range.source
  const ts = writeInterfaceRemoteClass(abiNode, fields, methods, isExported(code.node))

  const src = code.src.ctx.parse(ts, source.normalizedPath)
  const idx = source.statements.indexOf(code.node as Statement)
  source.statements.splice(idx+1, 0, ...src.statements)
}

/**
 * Removes ambient context from delcared plain objects.
 */
function objectToClass(code: CodeNode<ClassDeclaration>): void {
  const abiNode = code.abiNode as ObjectNode

  const source = code.node.range.source
  const ts = writeObjectClass(abiNode, true)
  
  const src = code.src.ctx.parse(ts, source.normalizedPath)
  // add original members into new class with transformations
  // 1 - all fields become public
  // 2 - protected modifer is removed from methods (private is kept)
  ;(<ClassDeclaration>src.statements[0]).members = code.node.members.map(n => {
    n.flags &= ~CommonFlags.Ambient
    n.flags &= ~CommonFlags.Readonly
    n.flags &= ~CommonFlags.Protected
    n.flags &= ~CommonFlags.Private
    if (!isPublic(n.flags)) { n.flags |= CommonFlags.Public }
    return n
  })
  const idx = source.statements.indexOf(code.node as Statement)
  source.statements.splice(idx+1, 0, ...src.statements)
}


// --
// IMPORT TRANSFORMATION
// --

/**
 * Transforms the given Import class to a remote class implementation.
 */
function importToRemoteClass(code: CodeNode<ClassDeclaration>, pkgId: string): void {
  const abiNode = code.abiNode as ClassNode

  const fields = abiNode.fields
  const methods = abiNode.methods.filter(n => n.kind <= MethodKind.PUBLIC)

  const source = code.node.range.source
  const ts = writeImportedRemoteClass(abiNode, fields, methods, pkgId, isExported(code.node))
  const src = code.src.ctx.parse(ts, source.normalizedPath)
  source.statements.push(...src.statements)
}

/**
 * Transforms the given Import function to a remote function implementation.
 */
function importToRemoteFunction(code: CodeNode<FunctionDeclaration>, pkgId: string): void {
  const abiNode = code.abiNode as FunctionNode
  const source = code.node.range.source
  const ts = writeImportedRemoteFunction(abiNode, pkgId)
  const src = code.src.ctx.parse(ts, source.normalizedPath)
  source.statements.push(...src.statements)
}


// --
// MISCELANEOUS MUTATIONS
// --

/**
 * Removes the given code AST node from the source.
 */
function dropDeclaration(code: CodeNode): void {
  const source = code.node.range.source
  const idx = source.statements.indexOf(code.node as Statement)
  source.statements.splice(idx, 1)
}


/**
 * Updates an import statement with Jig class names where needed.
 */
function updateImportStatement(im: ImportNode): void {
  const names = im.edges.reduce(reduceEdgeNames, [])
  const ts = writeImportStatement(names, im.path!);
  const source = im.src.source
  const src = im.graph.parse(ts, source.normalizedPath)
  const idx = source.statements.indexOf(im.node)
  source.statements.splice(idx, 1, ...src.statements)
}

/**
 * Updates an export statement with Jig class names where needed.
 */
function updateExportStatement(ex: ExportNode): void {
  const names = ex.edges.reduce(reduceEdgeNames, [])
  const ts = writeExportStatement(names, ex.path);
  const source = ex.src.source
  const src = ex.graph.parse(ts, source.normalizedPath)
  const idx = source.statements.indexOf(ex.node)
  source.statements.splice(idx, 1, ...src.statements)
}

/**
 * Replaces an entry file export statement by removeing Jig class names where needed.
 */
function updateEntryExportStatement(ex: ExportNode): void {
  const importNames = ex.edges
    .reduce(reduceEdgeNames, [])

  const exportNames = ex.edges
    .filter(e => e.code.node.kind === NodeKind.FunctionDeclaration)
    .map(e => e.name)

  const ts: string[] = []
  ts.push(writeImportStatement(importNames, ex.path!))
  if (exportNames.length) {
    ts.push(writeExportStatement(exportNames))
  }
  
  const source = ex.src.source
  const src = ex.graph.parse(ts.join('\n'), source.normalizedPath)
  const idx = source.statements.indexOf(ex.node)
  source.statements.splice(idx, 1, ...src.statements)
}

/**
 * Inserts complex setter functions for any complex types (maps and sets).
 */
function complexTypeSetters(ctx: TransformGraph): void {
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
      ctx.entries[0].source.normalizedPath
    )
    ctx.entries[0].source.statements.push(...src.statements)
  }
}

/**
 * Mutates static property access expressions on Jig classes to use LocalClass.
 */
function mutateJigPropertyAccess(node: PropertyAccessExpression): void {
  const id = node.expression as IdentifierExpression
  id.text = `__Local${id.text}`
}

/**
 * Mutates instanceof expressions on Jig classes to use LocalClass and RemoteClass.
 */
function mutateInstanceOfJig(
  node: InstanceOfExpression,
  parent: ParentNode,
  prop: string,
  ctx: TransformGraph
): void {
  const varName = (<IdentifierExpression>node.expression).text
  const jigName = (<NamedTypeNode>node.isType).name.identifier.text

  const code = `(${varName} instanceof __Local${jigName} || ${varName} instanceof __Proxy${jigName})`
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
 * Mutates new expressions on Jig classes to use RemoteClass.
 */
function mutateNewJigExpression(node: NewExpression): void {
  const id = node.typeName.identifier as IdentifierExpression
  id.text = `__Proxy${id.text}`
}

/**
 * Mutates Jig class type node to use RemoteClass.
 */
function mutateJigTypeArg(node: NamedTypeNode): void {
  const id = node.name.identifier
  id.text = `__Proxy${id.text}`
}


// --
// HELPERS
// --

/**
 * Returns true if the given class name is exported from the specified source.
 */
function isExportedJig(name: string, source: Source, ctx: TransformGraph): boolean {
  return ctx.exports.some(ex => {
    return ex.code.node.kind === NodeKind.ClassDeclaration &&
      ex.code.name === name &&
      ex.code.node.range.source.normalizedPath == source.normalizedPath
  })
}

/**
 * reduce import and export edges into a list of names.
 */
function reduceEdgeNames(names: string[], e: ImportEdge | ExportEdge): string[] {
  names.push(e.name)
  if (e.code.abiCodeKind === CodeKind.CLASS) {
    names.push(`__Local${e.name}`)
    names.push(`__Proxy${e.name}`)
  }
  if (e.code.abiCodeKind === CodeKind.INTERFACE) {
    names.push(`__Proxy${e.name}`)
  }
  return names
}

/**
 * Returns true if the given statement is exported NOT from a user entry.
 */
function isExported(node: DeclarationStatement): boolean {
  return (node.flags & CommonFlags.Export) === CommonFlags.Export &&
    node.range.source.sourceKind !== SourceKind.UserEntry
}