import {
  ClassDeclaration,
  DeclarationStatement,
  FieldDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  MethodDeclaration,
  NamedTypeNode,
  NodeKind,
  ParameterNode,
} from 'assemblyscript'

import {
  ArgNode,
  ClassNode,
  CodeKind,
  FieldNode,
  FunctionNode,
  InterfaceNode,
  MethodKind,
  MethodNode,
  ObjectNode,
  TypeNode,
  normalizeTypeName,
} from '@aldea/core/abi'

import {
  SourceNode,
} from './index.js'

import {
  assertClassLike,
  isClass,
  isFunction,
  isInterface,
} from './helpers.js'

import { isConstructor, isInstance, isPrivate, isProtected, isStatic } from '../filters.js';


export class CodeNode<T extends DeclarationStatement = DeclarationStatement> {
  name: string;
  #abiNode?: ClassNode | FunctionNode | InterfaceNode | ObjectNode;
  #idx?: number;

  constructor(
    public src: SourceNode,
    public node: T,
  ) {
    this.name = node.name.text
  }

  get abiNode(): ClassNode | FunctionNode | InterfaceNode | ObjectNode {
    if (!this.#abiNode) {
      if (isClass(this.node)) {
        this.#abiNode = this.isObj ?
          toObjectNode(this.node) :
          toClassNode(this.node, this.findAllParents())
      } else if (isFunction(this.node)) {
        this.#abiNode = toFunctionNode(this.node)
      } else if (isInterface(this.node)) {
        this.#abiNode = toInterfaceNode(this.node, this.findAllParents())
      }
    }
    if (!this.#abiNode) { throw new Error(`abi node not created for node kind: ${this.node.kind}`) }
    return this.#abiNode
  }

  get abiCodeKind(): CodeKind {
    switch(this.node.kind) {
      case NodeKind.ClassDeclaration:
        return this.isObj ? CodeKind.OBJECT : CodeKind.CLASS
      case NodeKind.FunctionDeclaration: return CodeKind.FUNCTION
      case NodeKind.InterfaceDeclaration: return CodeKind.INTERFACE
      default:
        throw new Error(`unrecognised code kind: ${this.node.kind}`)
    }
  }

  get idx(): number {
    if (typeof this.#idx === 'undefined') this.#idx = this.src.codes.indexOf(this)
    return this.#idx
  }

  get isJig(): boolean {
    if (isClass(this.node)) {
      const parents = this.findAllParents()
      const tip = parents.length ? parents[parents.length-1] : this
      return (<ClassNode>tip.abiNode).extends === 'Jig'
    } else {
      return false
    }
  }

  get isObj(): boolean {
    if (isClass(this.node)) {
      return !this.node.extendsType && !this.node.members.some(n => n.kind === NodeKind.MethodDeclaration)
    } else {
      return false
    }
  }

  findParent(): CodeNode<ClassDeclaration | InterfaceDeclaration> | undefined {
    assertClassLike(this.node)
    
    if (this.node.extendsType) {
      const code = this.src.findCode(this.node.extendsType.name.identifier.text)
      if (code) return code as CodeNode<ClassDeclaration | InterfaceDeclaration>
    }
  }

  findAllParents(): Array<CodeNode<ClassDeclaration | InterfaceDeclaration>> {
    const parents: Array<CodeNode<ClassDeclaration | InterfaceDeclaration>> = []
    if (isClass(this.node)) {
      let parent = this.findParent()
      while (parent && parent.node !== this.node) {
        parents.push(parent)
        parent = parent.findParent()
      }
    } else if (isInterface(this.node)) {
      this.node.implementsTypes?.forEach(type => {
        const code = this.src.findCode(type.name.identifier.text)
        if (code) parents.push(code as CodeNode<InterfaceDeclaration>)
      })
    }
    return parents
  }
}

function toClassNode(
  node: ClassDeclaration,
  parents: Array<CodeNode<ClassDeclaration>>,
): ClassNode {
  const fields = node.members.filter(n => {
    return !isStatic(n.flags) && n.kind === NodeKind.FieldDeclaration
  })

  const pFieldNames = parents
    .flatMap(p => p.node.members.filter(n => n.kind === NodeKind.FieldDeclaration))
    .map(n => n.name.text)
    .filter((n, i, a) => a.indexOf(n) === i)

  fields.forEach((f, i) => {
    if (pFieldNames.includes(f.name.text)) {
      fields.splice(i, 1)
    }
  })

  const methodNodes = node.members.filter(n => n.kind === NodeKind.MethodDeclaration)
  const hasConstructor = methodNodes.some(n => isConstructor(n.flags))

  const methods = methodNodes
    .filter(n => !isStatic(n.flags) && !isPrivate(n.flags))
    .map(n => toMethodNode(n as MethodDeclaration))

  if (!hasConstructor) {
    methods.unshift({
      kind: MethodKind.PUBLIC,
      name: 'constructor',
      args: [],
      rtype: null,
    })
  }

  return {
    kind: CodeKind.CLASS,
    name: node.name.text,
    extends: node.extendsType?.name.identifier.text || '',
    implements: (node.implementsTypes || []).map(n => n.name.identifier.text),
    fields: fields.map(n => toFieldNode(n as FieldDeclaration)),
    methods: methods,
  }
}

function toFunctionNode(node: FunctionDeclaration): FunctionNode {
  return {
    kind: CodeKind.FUNCTION,
    name: node.name.text,
    args: node.signature.parameters.map(n => toArgNode(n as ParameterNode)),
    rtype: toTypeNode(node.signature.returnType as NamedTypeNode),
  }
}

function toInterfaceNode(
  node: InterfaceDeclaration,
  parents: Array<CodeNode<InterfaceDeclaration>>
): InterfaceNode {
  const fields = node.members.filter(n => {
    return n.kind === NodeKind.FieldDeclaration && !isStatic(n.flags)
  })

  const methods = node.members.filter(n => {
    return n.kind === NodeKind.MethodDeclaration
  })

  return {
    kind: CodeKind.INTERFACE,
    name: node.name.text,
    extends: parents.map(p => p.name),
    fields: fields.map(n => toFieldNode(n as FieldDeclaration)),
    methods: methods.map(n => toFunctionNode(n as FunctionDeclaration)),
  }
}

function toObjectNode(node: ClassDeclaration): ObjectNode {
  const fields = node.members.filter(n => {
    return n.kind === NodeKind.FieldDeclaration && !isStatic(n.flags)
  })

  return {
    kind: CodeKind.OBJECT,
    name: node.name.text,
    fields: fields.map(n => toFieldNode(n as FieldDeclaration)),
  }
}

function toFieldNode(node: FieldDeclaration): FieldNode {
  return {
    name: node.name.text,
    type: toTypeNode(node.type as NamedTypeNode)
  }
}

function toMethodNode(node: MethodDeclaration): MethodNode {
  const kind = isProtected(node.flags) ? MethodKind.PROTECTED : MethodKind.PUBLIC
  const name = node.name.text
  const args = node.signature.parameters.map(n => toArgNode(n as ParameterNode))
  const rtype = name === 'constructor' ? null : toTypeNode(node.signature.returnType as NamedTypeNode)
  return { kind, name, args, rtype }
}

function toArgNode(node: ParameterNode): ArgNode {
  return {
    name: node.name.text,
    type: toTypeNode(node.type as NamedTypeNode)
  }
}

function toTypeNode(node: NamedTypeNode): TypeNode {
  const args = node.typeArguments?.map(n => toTypeNode(n as NamedTypeNode))

  return {
    name: node.name.identifier.text,
    nullable: node.isNullable,
    args: args || []
  }
}