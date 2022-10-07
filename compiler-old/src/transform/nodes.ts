import {
  ClassDeclaration,
  CommonFlags,
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
  StringLiteralExpression,
} from 'assemblyscript'

import { TransformCtx } from './context.js'


/**
 * This module defines a collection of Node classes that simply wrap aroun the
 * AssemblyScript AST nodes. The classes and interfaces in this module provide
 * a way of traversing the native nodes with a simpler and more target API for
 * Aldea's purposes.
 */


// Basic node type
interface BasicNode {
  flags: number;
  decorators?: DecoratorNode[] | null;
}


/**
 * Base node class
 */
export class BaseNode<T extends BasicNode> {
  node: T;
  decorators: Decorator[];

  constructor(node: T) {
    this.node = node
    this.decorators = collectDecorators(node.decorators || [])
  }

  get isAmbiant(): boolean {
    return (this.node.flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
  }

  get isExported(): boolean {
    return (this.node.flags & CommonFlags.EXPORT) === CommonFlags.EXPORT
  }

  get isPrivate(): boolean {
    return (this.node.flags & CommonFlags.PRIVATE) === CommonFlags.PRIVATE
  }

  get isProtected(): boolean {
    return (this.node.flags & CommonFlags.PROTECTED) === CommonFlags.PROTECTED
  }
}


/**
 * Class node
 */
export class ClassNode extends BaseNode<ClassDeclaration> {
  ctx: TransformCtx;
  name: string;           // class name
  iName: string;          // instance name
  fields: FieldNode[];    // properties
  methods: MethodNode[];  // methods

  constructor(node: ClassDeclaration, ctx: TransformCtx) {
    super(node)
    this.ctx = ctx
    this.name = node.name.text
    this.iName = `$${ node.name.text.toLowerCase() }`
    this.fields = collectFields(node.members)
    this.methods = collectMethods(node.members)
  }

  get isAbstract(): boolean {
    return this.isAmbiant && !this.isExternal
  }

  get isExternal(): boolean {
    return this.isAmbiant && this.decorators.some(d => d.name === 'jig')
  }

  get isComplex(): boolean {
    return !this.isAmbiant
  }

  get isJig(): boolean {
    return this.isComplex && this.isExported
  }

  get isSidekick(): boolean {
    return this.isComplex && !this.isExported
  }
}


/**
 * Field node - can represent a instance property OR a method argument
 */
export class FieldNode extends BaseNode<FieldDeclaration | ParameterNode> implements Field {
  name: string;
  type: Type;

  constructor(node: FieldDeclaration | ParameterNode) {
    super(node)
    this.name = node.name.text
    this.type = typeFromNode(node.type as NamedTypeNode)
  }
}


/**
 * Method node - a class constructor, static, or instance method
 */
export class MethodNode extends BaseNode<MethodDeclaration> {
  name: string;
  args: FieldNode[];
  rType: Type;

  constructor(node: MethodDeclaration) {
    super(node)
    this.name = node.name.text
    this.args = node.signature.parameters.map((n): FieldNode => new FieldNode(n))
    this.rType = typeFromNode(node.signature.returnType as NamedTypeNode)
  }

  get isConstructor(): boolean {
    return (this.node.flags & CommonFlags.CONSTRUCTOR) === CommonFlags.CONSTRUCTOR
  }

  get isStatic(): boolean {
    return (this.node.flags & CommonFlags.STATIC) === CommonFlags.STATIC
  }
}


/**
 * Decorator type
 */
export interface Decorator {
  name: string;
  args: string[];
}

/**
 * Field type
 */
export interface Field {
  name: string;
  type: Type;
  keepName?: boolean;
}

/**
 * Type type - generics will be collected as type args
 */
export interface Type {
  name: string;
  args?: Type[];
}


/**
 * Helpers
 */

// Maps all AS Custom DecoratorNodes as simple Decorator types
function collectDecorators(nodes: DecoratorNode[]): Decorator[] {
  return nodes
    .filter(n => n.decoratorKind === DecoratorKind.CUSTOM)
    .map((n): Decorator => decoratorFromNode(n))
}

// Maps a single AS DecoratorNode to a simple Decorator type
function decoratorFromNode(node: DecoratorNode): Decorator {
  const name = (node.name as IdentifierExpression).text
  const args = (node.args || [])
      .filter(a => a.kind === NodeKind.LITERAL)
      .filter(a => (a as LiteralExpression).literalKind === LiteralKind.STRING)
      .map((a): string => (a as StringLiteralExpression).value)

  return { name, args }
}

// Collect all properties declared in the statement nodes
function collectFields(nodes: DeclarationStatement[]): FieldNode[] {
  return nodes
    .filter(n => n.kind === NodeKind.FIELDDECLARATION)
    .map((n): FieldNode => new FieldNode(n as FieldDeclaration))
}

// Collect all methods declared in the statement nodes
function collectMethods(nodes: DeclarationStatement[]): MethodNode[] {
  return nodes
    .filter(n => n.kind === NodeKind.METHODDECLARATION)
    .map((n): MethodNode => new MethodNode(n as MethodDeclaration))
}

// Maps a single AS NamedTypeNode to a simple Type type
function typeFromNode(node: NamedTypeNode): Type {
  return {
    name: node.name.identifier.text,
    args: node.typeArguments?.map(n => typeFromNode(n as NamedTypeNode))
  }
}
