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
  Statement,
} from 'assemblyscript'

import {
  ArgNode,
  ClassNode,
  FieldNode,
  FunctionNode,
  InterfaceNode,
  MethodKind,
  MethodNode,
  ObjectNode,
  TypeNode,
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

import { isAmbient, isConstructor, isInstance, isPrivate, isProtected, isStatic } from '../filters.js';


export class CodeNode<T extends DeclarationStatement = DeclarationStatement> {
  name: string;
  #abiNode?: ClassNode | FunctionNode | InterfaceNode | ObjectNode;

  constructor(
    public src: SourceNode,
    public node: T,
  ) {
    this.name = node.name.text
  }

  get abiNode(): ClassNode | FunctionNode | InterfaceNode | ObjectNode {
    if (!this.#abiNode) {
      if (isClass(this.node)) {
        this.#abiNode = toClassNode(this.node, this.findAllParents())
      } else if (isFunction(this.node)) {
        this.#abiNode = toFunctionNode(this.node)
      } else if (isInterface(this.node)) {
        this.#abiNode = toInterfaceNode(this.node)
      }
    }
    if (!this.#abiNode) { throw new Error('//todo xxxx') }
    return this.#abiNode
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
      return isAmbient(this.node.flags) &&
        !this.node.extendsType &&
        !this.node.members.some(n => n.kind === NodeKind.MethodDeclaration) &&
        !this.src.ctx.imports.some(im => im.code.node === this.node)
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
    let parent = this.findParent()
    while (parent) {
      parents.push(parent)
      parent = parent.findParent()
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

  const methods = node.members.filter(n => {
    return n.kind === NodeKind.MethodDeclaration && !isStatic(n.flags) && !isPrivate(n.flags)
  })

  return {
    name: node.name.text,
    extends: node.extendsType?.name.identifier.text || '',
    implements: (node.implementsTypes || []).map(n => toTypeNode(n)),
    fields: fields.map(n => toFieldNode(n as FieldDeclaration)),
    methods: methods.map(n => toMethodNode(n as MethodDeclaration)),
  }
}

function toFunctionNode(node: FunctionDeclaration): FunctionNode {
  return {
    name: node.name.text,
    args: node.signature.parameters.map(n => toArgNode(n as ParameterNode)),
    rtype: toTypeNode(node.signature.returnType as NamedTypeNode),
  }
}

function toInterfaceNode(node: InterfaceDeclaration): InterfaceNode {
  const fields = node.members.filter(n => {
    return n.kind === NodeKind.FieldDeclaration && !isStatic(n.flags)
  })

  const methods = node.members.filter(n => {
    return n.kind === NodeKind.MethodDeclaration
  })

  return {
    name: node.name.text,
    extends: node.extendsType?.name.identifier.text || '',
    fields: fields.map(n => toFieldNode(n as FieldDeclaration)),
    methods: methods.map(n => toFunctionNode(n as FunctionDeclaration)),
  }
}

function toFieldNode(node: FieldDeclaration): FieldNode {
  return {
    name: node.name.text,
    type: toTypeNode(node.type as NamedTypeNode)
  }
}

function toMethodNode(node: MethodDeclaration): MethodNode {
  let kind: MethodKind;
  switch (true) {
    case isConstructor(node.flags):
      kind = MethodKind.CONSTRUCTOR
      break
    case isProtected(node.flags):
      kind = MethodKind.PROTECTED
      break
    case isInstance(node.flags):
    default:
      kind = MethodKind.PUBLIC
  }

  const rtype = kind === MethodKind.CONSTRUCTOR ?
    null :
    toTypeNode(node.signature.returnType as NamedTypeNode);

  return {
    kind,
    name: node.name.text,
    args: node.signature.parameters.map(n => toArgNode(n as ParameterNode)),
    rtype,
  }
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