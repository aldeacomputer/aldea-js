import {
  ClassDeclaration,
  DecoratorKind,
  DecoratorNode,
  FieldDeclaration,
  IdentifierExpression,
  LiteralExpression,
  LiteralKind,
  MethodDeclaration,
  NamedTypeNode,
  NodeKind,
  ParameterNode,
  Parser,
  StringLiteralExpression,
  Source,
  SourceKind,
  Program,
  Class,
  FunctionDeclaration,
  InterfaceDeclaration,
} from 'assemblyscript'

import {
  ExportWrap,
  ImportWrap,
  ClassWrap,
  ObjectWrap,
  FunctionWrap,
  InterfaceWrap,
  MethodWrap,
  FieldWrap,
  ArgWrap,
  TypeWrap,
  DecoratorTag,
} from './nodes.js'

import {
  isAmbient,
  isConstructor,
  isExported,
  isPrivate,
  isProtected,
  isStatic,
  isInstance,
} from './filters.js'

import { Validator } from './validator.js'
import { abiFromJson, normalizeTypeName } from '../abi.js';

import {
  Abi,
  CodeKind,
  MethodKind,
  FieldKind,
  TypeNode,
  TypeIdNode,
} from '../abi/types.js'

type CodeDeclaration = ClassDeclaration | FunctionDeclaration | InterfaceDeclaration

/**
 * Transform Context class.
 * 
 * Collects user sources from the given parser, and from there builds a list
 * of object nodes that the transformer needs knowledge off.
 * 
 * From this list of we can build our own ABI.
 */
export class TransformCtx {
  parser: Parser;
  program?: Program;
  sources: Source[];
  entries: Source[];
  exports: ExportWrap[];
  imports: ImportWrap[];
  objects: ObjectWrap[];
  exposedTypes: Map<string, TypeNode>;
  validator: Validator = new Validator(this);
  #typeIds?: TypeIdNode[];

  constructor(parser: Parser) {
    this.parser = parser
    this.sources = collectUserSources(parser.sources)
    this.entries = collectUserEntries(this.sources)
    this.exports = collectExports(this.entries)
    this.imports = collectImports(this.sources)
    this.objects = collectObjects(this.sources, this.exports)
    this.exposedTypes = collectExposedTypes(this)

    this.validate()
  }

  get abi(): Abi {
    return abiFromJson(JSON.stringify({
      version: 1,
      exports: this.mapExports(),
      imports: this.imports,
      objects: this.objects,
      typeIds: this.mapTypeIds(),
    }, function(key, val) {
      if (key === 'node') { return undefined }
      return val
    }))
  }

  parse(code: string, path: string): Source {
    const parser = new Parser(this.parser.diagnostics)
    parser.parseFile(code, path, true)
    return parser.sources[0]
  }

  validate() {
    if (!this.exports.length) {
      throw new Error('must export at least one object or function')
    }
    this.validator.validate()
  }

  private mapTypeIds(): TypeIdNode[] {
    if (!this.program) return []
    if (!this.#typeIds) {
      const whitelist = ['JigInitParams', 'Output', 'Lock', 'Coin']
        .concat(...this.imports.filter(im => im.kind === CodeKind.CLASS).map(im => im.name))

      function whiteListType(type: TypeNode): void {
        const name = normalizeTypeName(type)
        if (!whitelist.includes(name)) { whitelist.push(name) }
        type.args.forEach(whiteListType)
      }

      this.exposedTypes.forEach(whiteListType)

      const exportList = this.exports
        .filter(ex => ex.kind === CodeKind.CLASS)
        .map(ex => ex.code.name)
      
      const interfaceList = this.exports
        .filter(ex => ex.kind === CodeKind.INTERFACE)
        .concat(...this.imports.filter(im => im.kind === CodeKind.INTERFACE))
        .map(n => n.code.name)

      this.#typeIds = [...this.program.managedClasses].reduce((arr: TypeIdNode[], [id, klass]) => {
        const name = normalizeClassName(klass)
        // whitelisted names go in as they are
        if (
          whitelist.includes(name) &&
          name !== 'Jig' &&
          !exportList.includes(name) &&
          !interfaceList.includes(name)) {
          arr.push({ id, name })
        }
        // the basejig is simply known as... Jig
        if (name === '_BaseJig') {
          arr.push({ id, name: 'Jig' })
        }
        // for local jigs we rename to the original with $ prefix
        if (/^_Local/.test(name)) {
          const lname = name.replace(/^_Local/, '')
          if (exportList.includes(lname)) {
            arr.push({ id, name: `$${lname}` })
          }
        }
        // for remote jigs and interfaces we rename to the original
        if (/^_Remote/.test(name)) {
          const rname = name.replace(/^_Remote/, '')
          if (exportList.includes(rname) || interfaceList.includes(rname)) {
            arr.push({ id, name: rname })
          }
        }
        return arr
      }, []).sort((a, b) => a.id - b.id)
    }
    return this.#typeIds
  }

  // in generating the abi we need to strip private methods and ensure a constructor
  private mapExports(): ExportWrap[] {
    return this.exports.map(ex => {
      if (ex.kind === CodeKind.CLASS) {
        const code = ex.code as ClassWrap
        code.methods = code.methods.filter(n => {
          return ![MethodKind.PRIVATE, MethodKind.PROTECTED].includes(n.kind)
        })
        if (!code.methods.some(n => n.kind === MethodKind.CONSTRUCTOR)) {
          code.methods.unshift({
            kind: MethodKind.CONSTRUCTOR,
            name: 'constructor',
            args: [],
            rtype: null
          })
        }
      }
      return ex
    })
  }
}

// Collects user sources from the given list of sources
function collectUserSources(sources: Source[]): Source[] {
  return sources
    .filter(s => {
      return s.sourceKind <= SourceKind.UserEntry && /^(?!~lib).+/.test(s.internalPath)
    })
    .sort((a, b) => { // Sort by source path name
      return a.range.source.normalizedPath.localeCompare(b.range.source.normalizedPath)
    })
}

// Collects user sources from the given list of sources
function collectUserEntries(sources: Source[]): Source[] {
  return sources.filter(s => s.sourceKind === SourceKind.UserEntry)
}

// Collects exports from the given list of sources
function collectExports(sources: Source[]): ExportWrap[] {
  const exports: ExportWrap[] = []

  sources
    .flatMap(s => s.statements)
    .forEach(n => {
      if (n.kind === NodeKind.ClassDeclaration && isExported((<ClassDeclaration>n).flags)) {
        exports.push(mapExport(CodeKind.CLASS, mapClass(n as ClassDeclaration)))
      }
  
      if (n.kind === NodeKind.FunctionDeclaration && isExported((<FunctionDeclaration>n).flags)) {
        exports.push(mapExport(CodeKind.FUNCTION, mapFunction(n as FunctionDeclaration)))
      }

      if (n.kind === NodeKind.InterfaceDeclaration && isExported((<InterfaceDeclaration>n).flags)) {
        exports.push(mapExport(CodeKind.INTERFACE, mapInterface(n as InterfaceDeclaration)))
      }
      
      // todo - export statements - need to resolve to actual class / function def
      // todo - export from statements - need to resolve to actual class / function def
    })
  
  // Gather all the classes
  const classes = exports
    .filter(ex => ex.kind === CodeKind.CLASS)
    .map(ex => ex.code as ClassWrap)

  const findParent = (name: string) => classes.find(n => n.name === name)
  
  // Iterate over classes and remove dupe fields in descendents
  for (const code of classes) {
    const parentFields: string[] = []
    let parent = findParent(code.extends)
    
    while (parent?.extends) {
      parent.fields.forEach(n => parentFields.push(n.name))
      parent = findParent(parent.extends)
    }

    code.fields.forEach((field, idx) => {
      if (parentFields.includes(field.name)) {
        code.fields.splice(idx, 1)
      }
    })
  }

  return exports
}

// Collects imported code from the given list of sources
function collectImports(sources: Source[]): ImportWrap[] {
  const imports: ImportWrap[] = []

  sources
    .flatMap(s => s.statements)
    .filter(n => isAmbient((<CodeDeclaration>n).flags))
    .forEach(n => {
      const importDecorator = (<CodeDeclaration>n).decorators
        ?.filter(d => d.decoratorKind === DecoratorKind.Custom)
        .map(d => mapDecorator(d))
        .find(d => d.name === 'imported')

      if (importDecorator && n.kind === NodeKind.ClassDeclaration) {
        imports.push(mapImport(CodeKind.CLASS, mapClass(n as ClassDeclaration), importDecorator))
      }
  
      if (importDecorator && n.kind === NodeKind.FunctionDeclaration) {
        imports.push(mapImport(CodeKind.FUNCTION, mapFunction(n as FunctionDeclaration), importDecorator))
      }

      if (importDecorator && n.kind === NodeKind.InterfaceDeclaration) {
        imports.push(mapImport(CodeKind.INTERFACE, mapInterface(n as InterfaceDeclaration), importDecorator))
      }
    })  

  return imports
}

// Collects plain objects from the given list of sources that are exposed by
// the given list of exports
function collectObjects(sources: Source[], exports: ExportWrap[]): ObjectWrap[] {
  const objectSet = new Set<ObjectWrap>()
  const checkedNodes: ClassDeclaration[] = []
  const possibleObjects: ObjectWrap[] = sources
    .flatMap(s => s.statements)
    .filter(n => n.kind === NodeKind.ClassDeclaration && isAmbient((<ClassDeclaration>n).flags))
    .filter(n => {
      const importDecorator = (<CodeDeclaration>n).decorators
        ?.filter(d => d.decoratorKind === DecoratorKind.Custom)
        .map(d => mapDecorator(d))
        .find(d => d.name === 'imported')
      return !importDecorator
    })
    .map(n => mapObject(n as ClassDeclaration))

  function applyClass(obj: ClassWrap | ObjectWrap | InterfaceWrap): void {
    if (!checkedNodes.includes(obj.node)) {
      checkedNodes.push(obj.node)
      obj.fields.forEach(n => applyType(n.type))
      if ("methods" in obj) {
        obj.methods.forEach(n => applyFunction(n as MethodWrap))
      }
    }
  }

  function applyFunction(fn: FunctionWrap | MethodWrap): void {
    fn.args.forEach(n => applyType(n.type))
    if (fn.rtype) { applyType(fn.rtype) }
  }

  function applyType(type: TypeNode): void {
    possibleObjects.filter(obj => obj.name === type.name).forEach(obj => {
      objectSet.add(obj)
      applyClass(obj)
    })
    type.args.forEach(applyType)
  }

  exports.forEach(ex => {
    switch(ex.kind) {
      case CodeKind.CLASS:
        applyClass(ex.code as ClassWrap)
        break
      case CodeKind.FUNCTION:
        applyFunction(ex.code as FunctionWrap)
        break
      case CodeKind.INTERFACE:
        applyClass(ex.code as InterfaceWrap)
        break
    }
  })
  
  return Array.from(objectSet)
}

// Collects exposed types from the given lists of exports and plain objects
function collectExposedTypes(ctx: TransformCtx): Map<string, TypeNode> {
  const map = new Map<string, TypeNode>()

  const setType = ({ node: _, ...type }: TypeWrap) => {
    map.set(normalizeTypeName(type), type)
  }

  const applyClass = (obj: ClassWrap | ObjectWrap | InterfaceWrap) => {
    obj.fields.forEach(n => setType(n.type as TypeWrap))
    if ("methods" in obj) {
      obj.methods.forEach(n => applyFunction(n as MethodWrap))
    }
  }

  const applyFunction = (fn: FunctionWrap | MethodWrap) => {
    fn.args.forEach(n => setType(n.type as TypeWrap))
    if (fn.rtype) { setType(fn.rtype as TypeWrap) }
  }

  const applyCode = (c: ExportWrap | ImportWrap) => {
    switch(c.kind) {
      case CodeKind.CLASS:
        applyClass(c.code as ClassWrap)
        break
      case CodeKind.FUNCTION:
        applyFunction(c.code as FunctionWrap)
        break
      case CodeKind.INTERFACE:
        applyClass(c.code as InterfaceWrap)
        break
    }
  }

  ctx.exports.forEach(applyCode)
  ctx.imports.forEach(applyCode)
  ctx.objects.forEach(applyClass)
  return map
}

// Maps the given parameters to an ExportNode
function mapExport(kind: CodeKind, code: ClassWrap | FunctionWrap | InterfaceWrap): ExportWrap {
  return {
    kind,
    code,
  }
}

// Maps the given parameters to an ImportNode
function mapImport(kind: CodeKind, code: ClassWrap | FunctionWrap | InterfaceWrap, decorator: DecoratorTag): ImportWrap {
  return {
    kind,
    pkg: decorator.args[0],
    name: code.name,
    code,
  }
}

// Maps the given AST node to a ClassNode
function mapClass(node: ClassDeclaration): ClassWrap {
  const obj = mapObject(node) as ClassWrap
  obj.implements = (node.implementsTypes || []).map(n => mapType(n))
  obj.methods = node.members
    .filter(n => n.kind === NodeKind.MethodDeclaration)
    .map(n => mapMethod(n as MethodDeclaration))
  return obj
}

// Maps the given AST node to an ObjectNode
function mapObject(node: ClassDeclaration): ObjectWrap {
  const fields = node.members.filter(n => {
    return n.kind === NodeKind.FieldDeclaration && !isStatic(n.flags)
  })

  return {
    node,
    name: node.name.text,
    extends: node.extendsType?.name.identifier.text || null,
    fields: fields.map(n => mapField(n as FieldDeclaration)),
  }
}

// Maps the given AST node to a FunctionNode
function mapFunction(node: FunctionDeclaration): FunctionWrap {
  return {
    node,
    name: node.name.text,
    args: node.signature.parameters.map(n => mapArg(n as ParameterNode)),
    rtype: mapType(node.signature.returnType as NamedTypeNode),
  }
}

// Maps the given AST node to an InterfaceNode
function mapInterface(node: InterfaceDeclaration): InterfaceWrap {
  const obj = mapObject(node) as InterfaceWrap

  const methods = node.members.filter(n => n.kind === NodeKind.MethodDeclaration)
  obj.methods = methods.map(n => mapFunction(n as MethodDeclaration))
  return obj
}

// Maps the given AST node to a MethodNode
function mapMethod(node: MethodDeclaration): MethodWrap {
  let kind: MethodKind;
  switch (true) {
    case isConstructor(node.flags):
      kind = MethodKind.CONSTRUCTOR
      break
    case isStatic(node.flags):
      kind = MethodKind.STATIC
      break
    case isPrivate(node.flags):
      kind = MethodKind.PRIVATE
      break
    case isProtected(node.flags):
      kind = MethodKind.PROTECTED
      break
    case isInstance(node.flags):
    default:
      kind = MethodKind.INSTANCE
  }

  const rtype = kind === MethodKind.CONSTRUCTOR ?
    null :
    mapType(node.signature.returnType as NamedTypeNode);

  return {
    node,
    kind,
    name: node.name.text,
    args: node.signature.parameters.map(n => mapArg(n as ParameterNode)),
    rtype,
  }
}

// Maps the given AST node to a FieldNode
function mapField(node: FieldDeclaration): FieldWrap {
  const kind = isPrivate(node.flags) ? FieldKind.PRIVATE :
    (isProtected(node.flags) ? FieldKind.PROTECTED : FieldKind.PUBLIC);

  return {
    node,
    kind,
    name: node.name.text,
    type: mapType(node.type as NamedTypeNode)
  }
}

// Maps the given AST node to an ArgNode
function mapArg(node: ParameterNode): ArgWrap {
  return {
    node,
    name: node.name.text,
    type: mapType(node.type as NamedTypeNode)
  }
}

// Maps the given AST node to a TypeNode
function mapType(node: NamedTypeNode): TypeWrap {
  const args = node.typeArguments?.map(n => mapType(n as NamedTypeNode))

  return {
    node,
    name: node.name.identifier.text,
    nullable: node.isNullable,
    args: args || []
  }
}

// Maps the given AST node to a DecoratorTag
function mapDecorator(node: DecoratorNode): DecoratorTag {
  const args = node.args
    ?.filter(a => a.kind === NodeKind.Literal && (<LiteralExpression>a).literalKind === LiteralKind.String)
    .map(a => (<StringLiteralExpression>a).value)

  return {
    node,
    name: (<IdentifierExpression>node.name).text,
    args: args || [],
  }
}

// Normalizes class name to match normalized type name
function normalizeClassName(klass: Class): string {
  const name = klass.name.replace(/^(\w+)<.*>$/, '$1')
  const args = klass.typeArguments?.map(t => {
    return t.classReference ? normalizeClassName(t.classReference) : t.toString()
  })

  return normalizeName(name) +  (args ? `<${ args.join(',') }>` : '')
}

// Lower case string to match our typeings
const normalizeName = (n: string) => n === 'String' ? n.toLowerCase() : n
