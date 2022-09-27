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
  Class
} from 'assemblyscript'

import {
  ObjectWrap,
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
  isStatic
} from './filters.js'

import {
  Abi,
  RtIds,
  FieldKind,
  MethodKind,
  ObjectKind,
  TypeNode,
} from '../abi/types.js'

/**
 * Transform Context class.
 * 
 * Collects user sources from the given parser, and from there builds a list
 * of object nodes that represent the ABI.
 */
export class TransformCtx {
  parser: Parser;
  program?: Program;
  sources: Source[]; 
  entry: Source;
  objects: ObjectWrap[];

  constructor(parser: Parser) {
    this.parser = parser
    this.sources = collectUserSources(parser.sources)
    this.entry = findUserEntry(this.sources)
    this.objects = collectObjectNodes(this.entry)
    this.validate()
  }

  get abi(): Abi {
    const rtids = this.program ?
      [...this.program.managedClasses].reduce((obj: RtIds, [id, klass]) => {
        obj[klass.name] = id
        return obj
      }, {}) :
      {};

    return {
      version: 1,
      rtids,
      objects: this.objects
    }
  }

  get plainObjects(): ObjectWrap[] {
    return this.objects.filter(obj => obj.kind === ObjectKind.PLAIN)
  }

  get importedObjects(): ObjectWrap[] {
    return this.objects.filter(obj => obj.kind === ObjectKind.IMPORTED)
  }

  get exportedObjects(): ObjectWrap[] {
    return this.objects.filter(obj => obj.kind === ObjectKind.EXPORTED)
  }

  parse(code: string, path: string): Source {
    const parser = new Parser(this.parser.diagnostics)
    parser.parseFile(code, path, true)
    return parser.sources[0]
  }

  validate(): boolean {
    // TODO - validate context
    return true
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
    .filter(n => n.kind > -1)
}

// Collects Field Nodes from the given list of nodes
function collectFieldNodes(nodes: DeclarationStatement[]): FieldWrap[] {
  return nodes
    .filter(n => n.kind === NodeKind.FIELDDECLARATION)
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

// Maps the given AST node to a Field Node
function mapFieldNode(node: FieldDeclaration | ParameterNode): FieldWrap {
  let kind
  const isParam = "parameterKind" in node
  if (!isParam) {
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
