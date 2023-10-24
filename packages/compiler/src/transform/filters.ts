/**
 * Module includes a collection of filter methods based on AST node flags.
 * 
 * In addition, `filterAST` is a recursive function for iterating through the
 * entire AST and filtering out the nodes you need.
 */
 import {
  AssertionExpression,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  CommaExpression,
  CommonFlags,
  ContinueStatement,
  DecoratorNode,
  DoStatement,
  ElementAccessExpression,
  EnumDeclaration,
  EnumValueDeclaration,
  ExportDefaultStatement,
  ExportImportStatement,
  ExportMember,
  ExportStatement,
  ExpressionStatement,
  FieldDeclaration,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  FunctionTypeNode,
  IfStatement,
  ImportDeclaration,
  ImportStatement,
  IndexSignatureNode,
  InstanceOfExpression,
  InterfaceDeclaration,
  MethodDeclaration,
  NamedTypeNode,
  NamespaceDeclaration,
  NewExpression,
  Node,
  NodeKind,
  ParameterNode,
  ParenthesizedExpression,
  PropertyAccessExpression,
  ReturnStatement,
  Source,
  SwitchCase,
  SwitchStatement,
  TernaryExpression,
  ThrowStatement,
  TryStatement,
  TypeDeclaration,
  TypeName,
  TypeParameterNode,
  UnaryPostfixExpression,
  UnaryPrefixExpression,
  VariableDeclaration,
  VariableStatement,
  VoidStatement,
  WhileStatement
} from 'assemblyscript'

/**
 * Returns true if the node is an ambiant class.
 * 
 * An ambient class is a declared class without implementation.
 */
export function isAmbient(flags: number): boolean {
  return (flags & CommonFlags.Ambient) === CommonFlags.Ambient
}

/**
 * Returns true if the node is a constructor method.
 */
export function isConst(flags: number): boolean {
  return (flags & CommonFlags.Const) === CommonFlags.Const
}

/**
 * Returns true if the node is a constructor method.
 */
export function isConstructor(flags: number): boolean {
  return (flags & CommonFlags.Constructor) === CommonFlags.Constructor
}

/**
 * Returns true if the node exported from its module.
 */
export function isExported(flags: number): boolean {
  return (flags & CommonFlags.Export) === CommonFlags.Export
}

/**
 * Returns true if the node is a getter method.
 */
export function isGetter(flags: number): boolean {
  return (flags & CommonFlags.Get) === CommonFlags.Get
}

/**
 * Returns true if the node is a readonly method.
 */
export function isReadonly(flags: number): boolean {
  return (flags & CommonFlags.Readonly) === CommonFlags.Readonly
}

/**
 * Returns true if the node is a getter method.
 */
export function isSetter(flags: number): boolean {
  return (flags & CommonFlags.Set) === CommonFlags.Set
}

/**
 * Returns true if the node has a public modifier.
 */
export function isPublic(flags: number): boolean {
  return (flags & CommonFlags.Public) === CommonFlags.Public
}

/**
 * Returns true if the node has a private modifier.
 */
export function isPrivate(flags: number): boolean {
  return (flags & CommonFlags.Private) === CommonFlags.Private
}

/**
 * Returns true if the node has a protected modifier.
 */
export function isProtected(flags: number): boolean {
  return (flags & CommonFlags.Protected) === CommonFlags.Protected
}

/**
 * Returns true if the node is a static method.
 */
export function isStatic(flags: number): boolean {
  return (flags & CommonFlags.Static) === CommonFlags.Static
}

/**
 * Returns true if the node is an instance method.
 */
export function isInstance(flags: number): boolean {
  return (flags & CommonFlags.Instance) === CommonFlags.Instance
}

/**
 * Given an AST node element, will walk through all descendant and execute a
 * callback on each node in the tree. The callback provides a mechanism to
 * filter by specific node kinds.
 */
 export function filterAST(
  node: Node | Node[] | null,
  callback: (node: Node, parent?: Node, parentProp?: string) => void,
  parent?: Node,
  parentProp?: string
): void {
  if (!node) return
  if (Array.isArray(node)) return node.forEach(n => filterAST(n, callback, parent, parentProp))

  switch (node.kind) {
    case NodeKind.Source:
      filterAST((<Source>node).statements, callback, node, 'statements')
      break
    case NodeKind.NamedType:
      filterAST((<NamedTypeNode>node).name, callback, node, 'name')
      filterAST((<NamedTypeNode>node).typeArguments, callback, node, 'typeArguments')
      break
    case NodeKind.FunctionType:
      filterAST((<FunctionTypeNode>node).parameters, callback, node, 'parameters')
      filterAST((<FunctionTypeNode>node).returnType, callback, node, 'returnType')
      filterAST((<FunctionTypeNode>node).explicitThisType, callback, node, 'explicitThisType')
      break
    case NodeKind.TypeName:
      filterAST((<TypeName>node).identifier, callback, node, 'identifier')
      filterAST((<TypeName>node).next, callback, node, 'next')
      break
    case NodeKind.TypeParameter:
      filterAST((<TypeParameterNode>node).name, callback, node, 'name')
      filterAST((<TypeParameterNode>node).extendsType, callback, node, 'extendsType')
      filterAST((<TypeParameterNode>node).defaultType, callback, node, 'defaultType')
      break
    case NodeKind.Parameter:
      filterAST((<ParameterNode>node).name, callback, node, 'name')
      filterAST((<ParameterNode>node).type, callback, node, 'type')
      filterAST((<ParameterNode>node).initializer, callback, node, 'initializer')
      filterAST((<ParameterNode>node).implicitFieldDeclaration, callback, node, 'implicitFieldDeclaration')
      break;
    case NodeKind.Identifier:
      break
    case NodeKind.Assertion:
      filterAST((<AssertionExpression>node).expression, callback, node, 'expression')
      filterAST((<AssertionExpression>node).toType, callback, node, 'toType')
      break    
    case NodeKind.Binary:
      filterAST((<BinaryExpression>node).left, callback, node, 'left')
      filterAST((<BinaryExpression>node).right, callback, node, 'right')
      break
    case NodeKind.Call:
      filterAST((<CallExpression>node).expression, callback, node, 'expression')
      filterAST((<CallExpression>node).typeArguments, callback, node, 'typeArguments')
      filterAST((<CallExpression>node).args, callback, node, 'args')
      break
    case NodeKind.Class:
      filterAST((<ClassExpression>node).declaration, callback, node, 'declaration')
      break
    case NodeKind.Comma:
      filterAST((<CommaExpression>node).expressions, callback, node, 'expressions')
      break
    case NodeKind.ElementAccess:
      filterAST((<ElementAccessExpression>node).expression, callback, node, 'expression')
      filterAST((<ElementAccessExpression>node).elementExpression, callback, node, 'elementExpression')
      break
    case NodeKind.False:
      break
    case NodeKind.Function:
      filterAST((<FunctionExpression>node).declaration, callback, node, 'declaration')
      break
    case NodeKind.InstanceOf:
      filterAST((<InstanceOfExpression>node).expression, callback, node, 'expression')
      filterAST((<InstanceOfExpression>node).isType, callback, node, 'isType')
      break
    case NodeKind.Literal:
      break
    case NodeKind.New:
      filterAST((<NewExpression>node).typeName, callback, node, 'typeName')
      filterAST((<NewExpression>node).typeArguments, callback, node, 'typeArguments')
      filterAST((<NewExpression>node).args, callback, node, 'args')
      break
    case NodeKind.Null:
      break
    case NodeKind.Omitted:
      break
    case NodeKind.Parenthesized:
      filterAST((<ParenthesizedExpression>node).expression, callback, node, 'expression')
      break
    case NodeKind.PropertyAccess:
      filterAST((<PropertyAccessExpression>node).expression, callback, node, 'expression')
      filterAST((<PropertyAccessExpression>node).property, callback, node, 'property')
      break
    case NodeKind.Ternary:
      filterAST((<TernaryExpression>node).condition, callback, node, 'condition')
      filterAST((<TernaryExpression>node).ifThen, callback, node, 'ifThen')
      filterAST((<TernaryExpression>node).ifElse, callback, node, 'ifElse')
      break
    case NodeKind.Super:
      break
    case NodeKind.This:
      break
    case NodeKind.True:
      break
    case NodeKind.Constructor:
      break
    case NodeKind.UnaryPostfix:
      filterAST((<UnaryPostfixExpression>node).operand, callback, node, 'operand')
      break
    case NodeKind.UnaryPrefix:
      filterAST((<UnaryPrefixExpression>node).operand, callback, node, 'operand')
      break
    case NodeKind.Compiled:
      break
    case NodeKind.Block:
      filterAST((<BlockStatement>node).statements, callback, node, 'statements')
      break
    case NodeKind.Break:
      filterAST((<BreakStatement>node).label, callback, node, 'label')
      break
    case NodeKind.Continue:
      filterAST((<ContinueStatement>node).label, callback, node, 'label')
      break
    case NodeKind.Do:
      filterAST((<DoStatement>node).body, callback, node, 'body')
      filterAST((<DoStatement>node).condition, callback, node, 'condition')
      break
    case NodeKind.Empty:
      break
    case NodeKind.Export:
      filterAST((<ExportStatement>node).members, callback, node, 'members')
      filterAST((<ExportStatement>node).path, callback, node, 'path')
      break
    case NodeKind.ExportDefault:
      filterAST((<ExportDefaultStatement>node).declaration, callback, node, 'declaration')
      break
    case NodeKind.ExportImport:
      filterAST((<ExportImportStatement>node).name, callback, node, 'name')
      filterAST((<ExportImportStatement>node).externalName, callback, node, 'externalName')
      break
    case NodeKind.Expression:
      filterAST((<ExpressionStatement>node).expression, callback, node, 'expression')
      break
    case NodeKind.For:
      filterAST((<ForStatement>node).initializer, callback, node, 'initializer')
      filterAST((<ForStatement>node).condition, callback, node, 'condition')
      filterAST((<ForStatement>node).incrementor, callback, node, 'incrementor')
      filterAST((<ForStatement>node).body, callback, node, 'body')
      break
    case NodeKind.ForOf:
      filterAST((<ForOfStatement>node).variable, callback, node, 'variable')
      filterAST((<ForOfStatement>node).iterable, callback, node, 'iterable')
      filterAST((<ForOfStatement>node).body, callback, node, 'body')
      break
    case NodeKind.If:
      filterAST((<IfStatement>node).condition, callback, node, 'condition')
      filterAST((<IfStatement>node).ifTrue, callback, node, 'ifTrue')
      filterAST((<IfStatement>node).ifFalse, callback, node, 'ifFalse')
      break
    case NodeKind.Import:
      filterAST((<ImportStatement>node).declarations, callback, node, 'declarations')
      filterAST((<ImportStatement>node).namespaceName, callback, node, 'namespaceName')
      filterAST((<ImportStatement>node).path, callback, node, 'path')
      break
    case NodeKind.Return:
      filterAST((<ReturnStatement>node).value, callback, node, 'value')
      break
    case NodeKind.Switch:
      filterAST((<SwitchStatement>node).condition, callback, node, 'condition')
      filterAST((<SwitchStatement>node).cases, callback, node, 'cases')
      break
    case NodeKind.Throw:
      filterAST((<ThrowStatement>node).value, callback, node, 'value')
      break
    case NodeKind.Try:
      filterAST((<TryStatement>node).bodyStatements, callback, node, 'bodyStatements')
      filterAST((<TryStatement>node).catchVariable, callback, node, 'catchVariable')
      filterAST((<TryStatement>node).catchStatements, callback, node, 'catchStatements')
      filterAST((<TryStatement>node).finallyStatements, callback, node, 'finallyStatements')
      break
    case NodeKind.Variable:
      filterAST((<VariableStatement>node).decorators, callback, node, 'decorators')
      filterAST((<VariableStatement>node).declarations, callback, node, 'declarations')
      break
    case NodeKind.Void:
      filterAST((<VoidStatement>node).expression, callback, node, 'expression')
      break
    case NodeKind.While:
      filterAST((<WhileStatement>node).condition, callback, node, 'condition')
      filterAST((<WhileStatement>node).body, callback, node, 'body')
      break
    case NodeKind.Module:
      break
    case NodeKind.ClassDeclaration:
      filterAST((<ClassDeclaration>node).name, callback, node, 'name')
      filterAST((<ClassDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<ClassDeclaration>node).typeParameters, callback, node, 'typeParameters')
      filterAST((<ClassDeclaration>node).extendsType, callback, node, 'extendsType')
      filterAST((<ClassDeclaration>node).implementsTypes, callback, node, 'implementsTypes')
      filterAST((<ClassDeclaration>node).members, callback, node, 'members')
      break
    case NodeKind.EnumDeclaration:
      filterAST((<EnumDeclaration>node).name, callback, node, 'name')
      filterAST((<EnumDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<EnumDeclaration>node).values, callback, node, 'values')
      break
    case NodeKind.EnumValueDeclaration:
      filterAST((<EnumValueDeclaration>node).name, callback, node, 'name')
      filterAST((<EnumValueDeclaration>node).initializer, callback, node, 'initializer')
      break
    case NodeKind.FieldDeclaration:
      filterAST((<FieldDeclaration>node).name, callback, node, 'name')
      filterAST((<FieldDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<FieldDeclaration>node).type, callback, node, 'type')
      filterAST((<FieldDeclaration>node).initializer, callback, node, 'initializer')
      break
    case NodeKind.FunctionDeclaration:
      filterAST((<FunctionDeclaration>node).name, callback, node, 'name')
      filterAST((<FunctionDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<FunctionDeclaration>node).typeParameters, callback, node, 'typeParameters')
      filterAST((<FunctionDeclaration>node).signature, callback, node, 'signature')
      filterAST((<FunctionDeclaration>node).body, callback, node, 'body')
      break
    case NodeKind.ImportDeclaration:
      filterAST((<ImportDeclaration>node).name, callback, node, 'name')
      filterAST((<ImportDeclaration>node).foreignName, callback, node, 'foreignName')
      break
    case NodeKind.InterfaceDeclaration:
      filterAST((<InterfaceDeclaration>node).name, callback, node, 'name')
      filterAST((<InterfaceDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<InterfaceDeclaration>node).typeParameters, callback, node, 'typeParameters')
      filterAST((<InterfaceDeclaration>node).extendsType, callback, node, 'extendsType')
      filterAST((<InterfaceDeclaration>node).implementsTypes, callback, node, 'implementsTypes')
      filterAST((<InterfaceDeclaration>node).members, callback, node, 'members')
      break
    case NodeKind.MethodDeclaration:
      filterAST((<MethodDeclaration>node).name, callback, node, 'name')
      filterAST((<MethodDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<MethodDeclaration>node).typeParameters, callback, node, 'typeParameters')
      filterAST((<MethodDeclaration>node).signature, callback, node, 'signature')
      filterAST((<MethodDeclaration>node).body, callback, node, 'body')
      break
    case NodeKind.NamespaceDeclaration:
      filterAST((<NamespaceDeclaration>node).name, callback, node, 'name')
      filterAST((<NamespaceDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<NamespaceDeclaration>node).members, callback, node, 'members')
      break
    case NodeKind.TypeDeclaration:
      filterAST((<TypeDeclaration>node).name, callback, node, 'name')
      filterAST((<TypeDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<TypeDeclaration>node).typeParameters, callback, node, 'typeParameters')
      filterAST((<TypeDeclaration>node).type, callback, node, 'type')
      break
    case NodeKind.VariableDeclaration:
      filterAST((<VariableDeclaration>node).name, callback, node, 'name')
      filterAST((<VariableDeclaration>node).decorators, callback, node, 'decorators')
      filterAST((<VariableDeclaration>node).type, callback, node, 'type')
      filterAST((<VariableDeclaration>node).initializer, callback, node, 'initializer')
      break
    case NodeKind.Decorator:
      filterAST((<DecoratorNode>node).name, callback, node, 'name')
      filterAST((<DecoratorNode>node).args, callback, node, 'args')
      break
    case NodeKind.ExportMember:
      filterAST((<ExportMember>node).localName, callback, node, 'localName')
      filterAST((<ExportMember>node).exportedName, callback, node, 'exportedName')
      break
    case NodeKind.SwitchCase:
      filterAST((<SwitchCase>node).label, callback, node, 'label')
      filterAST((<SwitchCase>node).statements, callback, node, 'statements')
      break
    case NodeKind.IndexSignature:
      filterAST((<IndexSignatureNode>node).keyType, callback, node, 'keyType')
      filterAST((<IndexSignatureNode>node).valueType, callback, node, 'valueType')
      break
    case NodeKind.Comment:
      break

    default:
      console.warn('Unrecognised node kind', node.kind)
      // console.log(node)
  }

  return callback(node, parent, parentProp)
}
