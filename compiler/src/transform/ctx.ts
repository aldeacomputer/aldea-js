import {
  ClassDeclaration,
  DeclarationStatement,
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
  TypeDeclaration,
  FunctionDeclaration,
} from 'assemblyscript'

import {
  ObjectWrap,
  FunctionWrap,
  DecoratorWrap,
  FieldWrap,
  MethodWrap,
  TypeWrap,
} from './nodes.js'

import {
  isAmbient,
  isConstructor,
  isExported,
  isPrivate,
  isProtected,
  isStatic,
} from './filters.js'

import { Validator } from './validator.js'
import { normalizeTypeName } from '../abi.js';

import {
  Abi,
  RuntimeIds,
  FieldKind,
  MethodKind,
  ObjectKind,
  TypeNode,
} from '../abi/types.js'

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
  entry: Source;
  objects: ObjectWrap[];
  functions: FunctionWrap[];
  validator: Validator;
  cache: SimpleCache = new SimpleCache();

  constructor(parser: Parser) {
    this.parser = parser
    this.sources = collectUserSources(parser.sources)
    this.entry = findUserEntry(this.sources)
    this.objects = collectObjectNodes(this.entry)     // todo - analyse all sources!
    this.functions = collectFunctionNodes(this.entry) // todo - analyse all sources!
    this.validator = new Validator(this)
    this.validate()
  }

  get abi(): Abi {
    return {
      version: 1,
      rtids: this.mapManagedClassRtIds(),
      objects: this.exposedObjects,
      functions: this.exportedFunctions
    }
  }

  // Objects explicitly exported from the module
  get exportedObjects(): ObjectWrap[] {
    return this.cache.get<ObjectWrap[]>('exportedObj', () => {
      return this.objects.filter(obj => obj.kind === ObjectKind.EXPORTED)
    })
  }

  // Objects explicitly exported from the module
  get exportedFunctions(): FunctionWrap[] {
    return this.cache.get<FunctionWrap[]>('exportedFn', () => {
      return this.functions.filter(obj => isExported(obj.node.flags))
    })
  }

  // Objects exposed by the module (exported, or as args or return values)
  get exposedObjects(): ObjectWrap[] {
    return this.cache.get<ObjectWrap[]>('exposedObj', () => {
      const objects: ObjectWrap[] = []

      const applyObject = (obj: ObjectWrap): void => {
        if (objects.includes(obj)) return
        objects.push(obj)
        obj.fields.forEach(n => applyType(n.type))
        obj.methods.forEach(applyFunction)
      }

      const applyFunction = (fn: FunctionWrap | MethodWrap): void => {
        fn.args.forEach(n => applyType(n.type))
        if (fn.rtype) applyType(fn.rtype)
      }

      const applyType = (type: TypeNode): void => {
        const obj = this.objects.find(obj => obj.name === type.name)
        if (obj) { applyObject(obj) }
        type.args.forEach(applyType)
      }

      this.exportedObjects.forEach(applyObject)
      this.exportedFunctions.forEach(applyFunction)
      return objects
    })
  }

  // Set of all types exposed as fields or arguments or return types
  get exposedTypes(): Map<string, TypeNode> {
    return this.cache.get<Map<string, TypeNode>>('exposedType', () => {
      const map = new Map<string, TypeNode>()

      const functionIter = (fn: FunctionWrap | MethodWrap) => {
        fn.args.forEach(n => map.set(normalizeTypeName(n.type), n.type))
        if (fn.rtype) { map.set(normalizeTypeName(fn.rtype), fn.rtype) }
      }
  
      this.exposedObjects.forEach(obj => {
        obj.fields.forEach(n => map.set(normalizeTypeName(n.type), n.type))
        obj.methods.forEach(functionIter)
      })
      this.exportedFunctions.forEach(functionIter)
      
      return map
    })
  }

  get plainObjects(): ObjectWrap[] {
    return this.cache.get<ObjectWrap[]>('plainObj', () => {
      return this.objects.filter(obj => obj.kind === ObjectKind.PLAIN)
    })
  }

  get importedObjects(): ObjectWrap[] {
    return this.cache.get<ObjectWrap[]>('importedObj', () => {
      return this.objects.filter(obj => obj.kind === ObjectKind.IMPORTED)
    })
  }

  parse(code: string, path: string): Source {
    const parser = new Parser(this.parser.diagnostics)
    parser.parseFile(code, path, true)
    return parser.sources[0]
  }

  validate() {
    if (!this.exportedObjects.length && !this.exportedFunctions.length) {
      throw new Error('must export at least one object or function')
    }
    this.validator.validate()
  }

  private mapManagedClassRtIds(): RuntimeIds {
    if (!this.program) return {}
    const whitelist = Array.from(this.exposedTypes.keys()).concat('LockState', 'UtxoState')
    return [...this.program.managedClasses].reduce((obj: RuntimeIds, [id, klass]) => {
      const name = normalizeClassName(klass)
      if (whitelist.includes(name)) { obj[name] = id }
      return obj
    }, {})
  }
}

/**
 * Mega simple cache class to improve performance of TransformCtx getters.
 */
class SimpleCache {
  data: {[key: string]: any} = {};

  get<T>(key: string, callback: () => T) {
    return this.data[key] ||= callback()
  }
}

// Collects user sources from the given list of sources
function collectUserSources(sources: Source[]): Source[] {
  return sources.filter(s => {
    return s.sourceKind <= SourceKind.USER_ENTRY && /^(?!~lib).+/.test(s.internalPath)
  })
}

// Finds the user entry from the given list of sources
function findUserEntry(sources: Source[]): Source {
  const entry = sources.find(s => s.sourceKind === SourceKind.USER_ENTRY)
  if (!entry) throw new Error('no user entry found')
  return entry
}

// Collects Object Nodes from the given list of sources
function collectObjectNodes(source: Source): ObjectWrap[] {
  return source.statements
    .filter(n => n.kind === NodeKind.CLASSDECLARATION)
    .map(n => mapObjectNode(n as ClassDeclaration))
}

// todo
function collectFunctionNodes(source: Source): FunctionWrap[] {
  return source.statements
    .filter(n => n.kind === NodeKind.FUNCTIONDECLARATION)
    .map(n => mapFunctionNode(n as FunctionDeclaration))
}

// Collects Field Nodes from the given list of nodes
function collectFieldNodes(nodes: DeclarationStatement[]): FieldWrap[] {
  return nodes
    .filter(n => n.kind === NodeKind.FIELDDECLARATION)
    .filter(n => !isStatic(n.flags))
    .map(n => mapFieldNode(n as FieldDeclaration))
}

// Collects Method Nodes from the given list of nodes
function collectMethodNodes(nodes: DeclarationStatement[]): MethodWrap[] {
  return nodes
    .filter(n => n.kind === NodeKind.METHODDECLARATION)
    .filter(n => !isPrivate(n.flags) && !isProtected(n.flags))
    .map(n => mapMethodNode(n as MethodDeclaration))
}

// Collects Decorator Nodes from the given list of nodes
function collectDecoratorNodes(nodes: DecoratorNode[]): DecoratorWrap[] {
  return nodes
    .filter(n => n.decoratorKind === DecoratorKind.CUSTOM)
    .map(mapDecoratorNode)
}

// Maps the given AST node to an Object Node
function mapObjectNode(node: ClassDeclaration): ObjectWrap {
  const decorators = collectDecoratorNodes(node.decorators || [])
  const kind = isAmbient(node.flags) ?
    (decorators.some(d => d.name === 'imported') ? ObjectKind.IMPORTED : ObjectKind.PLAIN) :
    (isExported(node.flags) ? ObjectKind.EXPORTED : -1);

  return {
    node,
    kind,
    name: node.name.text,
    extends: node.extendsType?.name.identifier.text || null,
    fields: collectFieldNodes(node.members),
    methods: collectMethodNodes(node.members),
    decorators,
  }
}

// Maps the given AST node to a Function Node
function mapFunctionNode(node: FunctionDeclaration): FunctionWrap {
  const decorators = collectDecoratorNodes(node.decorators || [])

  return {
    node,
    name: node.name.text,
    args: node.signature.parameters.map(n => mapFieldNode(n as ParameterNode)),
    rtype: mapTypeNode(node.signature.returnType as NamedTypeNode),
    decorators
  }
}

// Maps the given AST node to a Field Node
function mapFieldNode(node: FieldDeclaration | ParameterNode | TypeDeclaration): FieldWrap {
  let kind
  if (node.kind === NodeKind.FIELDDECLARATION) {
    kind = isPrivate(node.flags) ?
      FieldKind.PRIVATE :
      (isProtected(node.flags) ? FieldKind.PROTECTED : FieldKind.PUBLIC);
  }

  return {
    node,
    kind,
    name: node.name.text,
    type: mapTypeNode(node.type as NamedTypeNode)
  }
}

// Maps the given AST node to a Method Node
function mapMethodNode(node: MethodDeclaration): MethodWrap {
  const decorators = collectDecoratorNodes(node.decorators || [])
  const kind = isConstructor(node.flags) ?
    MethodKind.CONSTRUCTOR :
    (isStatic(node.flags) ? MethodKind.STATIC : MethodKind.INSTANCE);

  return {
    node,
    kind,
    name: node.name.text,
    args: node.signature.parameters.map(n => mapFieldNode(n as ParameterNode)),
    rtype: mapTypeNode(node.signature.returnType as NamedTypeNode),
    decorators
  }
}

// Maps the given AST node to a Type Node
function mapTypeNode(node: NamedTypeNode): TypeWrap {
  const args = (node.typeArguments || []).map(n => mapTypeNode(n as NamedTypeNode))

  return {
    node,
    name: node.name.identifier.text,
    args
  }
}

// Maps the given AST node to a Decorator Node
function mapDecoratorNode(node: DecoratorNode): DecoratorWrap {
  const args = (node.args || [])
    .filter(a => a.kind === NodeKind.LITERAL)
    .filter(a => (a as LiteralExpression).literalKind === LiteralKind.STRING)
    .map((a): string => (a as StringLiteralExpression).value)

  return {
    node,
    name: (node.name as IdentifierExpression).text,
    args,
  }
}

// Normalizes class name to match normalize type name
function normalizeClassName(klass: Class): string {
  const normalizeName = (n: string) => n === 'String' ? n.toLowerCase() : n
  const name = klass.name.replace(/^(\w+)<.*>$/, '$1')

  if (klass.typeArguments) {
    const args = klass.typeArguments.map(n => {
      const arg = n.classReference?.name || n.toString()
      return normalizeName(arg)
    })
    return name + `<${ args.join(',') }>`
  } else {
    return normalizeName(name)
  }
}
