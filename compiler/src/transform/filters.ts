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
  callback: (node: Node) => void
): void {
  if (!node) return
  if (Array.isArray(node)) return node.forEach(n => filterAST(n, callback))

  switch (node.kind) {
    case NodeKind.Source:
      filterAST((<Source>node).statements, callback)
      break
    case NodeKind.NamedType:
      filterAST((<NamedTypeNode>node).name, callback)
      filterAST((<NamedTypeNode>node).typeArguments, callback)
      break
    case NodeKind.FunctionType:
      filterAST((<FunctionTypeNode>node).parameters, callback)
      filterAST((<FunctionTypeNode>node).returnType, callback)
      filterAST((<FunctionTypeNode>node).explicitThisType, callback)
      break
    case NodeKind.TypeName:
      filterAST((<TypeName>node).identifier, callback)
      filterAST((<TypeName>node).next, callback)
      break
    case NodeKind.TypeParameter:
      filterAST((<TypeParameterNode>node).name, callback)
      filterAST((<TypeParameterNode>node).extendsType, callback)
      filterAST((<TypeParameterNode>node).defaultType, callback)
      break
    case NodeKind.Parameter:
      filterAST((<ParameterNode>node).name, callback)
      filterAST((<ParameterNode>node).type, callback)
      filterAST((<ParameterNode>node).initializer, callback)
      filterAST((<ParameterNode>node).implicitFieldDeclaration, callback)
      break;
    case NodeKind.Identifier:
      break
    case NodeKind.Assertion:
      filterAST((<AssertionExpression>node).expression, callback)
      filterAST((<AssertionExpression>node).toType, callback)
      break    
    case NodeKind.Binary:
      filterAST((<BinaryExpression>node).left, callback)
      filterAST((<BinaryExpression>node).right, callback)
      break
    case NodeKind.Call:
      filterAST((<CallExpression>node).expression, callback)
      filterAST((<CallExpression>node).typeArguments, callback)
      filterAST((<CallExpression>node).args, callback)
      break
    case NodeKind.Class:
      filterAST((<ClassExpression>node).declaration, callback)
      break
    case NodeKind.Comma:
      filterAST((<CommaExpression>node).expressions, callback)
      break
    case NodeKind.ElementAccess:
      filterAST((<ElementAccessExpression>node).expression, callback)
      filterAST((<ElementAccessExpression>node).elementExpression, callback)
      break
    case NodeKind.False:
      break
    case NodeKind.Function:
      filterAST((<FunctionExpression>node).declaration, callback)
      break
    case NodeKind.InstanceOf:
      filterAST((<InstanceOfExpression>node).expression, callback)
      filterAST((<InstanceOfExpression>node).isType, callback)
      break
    case NodeKind.Literal:
      break
    case NodeKind.New:
      filterAST((<NewExpression>node).typeName, callback)
      filterAST((<NewExpression>node).typeArguments, callback)
      filterAST((<NewExpression>node).args, callback)
      break
    case NodeKind.Null:
      break
    case NodeKind.Omitted:
      break
    case NodeKind.Parenthesized:
      filterAST((<ParenthesizedExpression>node).expression, callback)
      break
    case NodeKind.PropertyAccess:
      filterAST((<PropertyAccessExpression>node).expression, callback)
      filterAST((<PropertyAccessExpression>node).property, callback)
      break
    case NodeKind.Ternary:
      filterAST((<TernaryExpression>node).condition, callback)
      filterAST((<TernaryExpression>node).ifThen, callback)
      filterAST((<TernaryExpression>node).ifElse, callback)
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
      filterAST((<UnaryPostfixExpression>node).operand, callback)
      break
    case NodeKind.UnaryPrefix:
      filterAST((<UnaryPrefixExpression>node).operand, callback)
      break
    case NodeKind.Compiled:
      break
    case NodeKind.Block:
      filterAST((<BlockStatement>node).statements, callback)
      break
    case NodeKind.Break:
      filterAST((<BreakStatement>node).label, callback)
      break
    case NodeKind.Continue:
      filterAST((<ContinueStatement>node).label, callback)
      break
    case NodeKind.Do:
      filterAST((<DoStatement>node).body, callback)
      filterAST((<DoStatement>node).condition, callback)
      break
    case NodeKind.Empty:
      break
    case NodeKind.Export:
      filterAST((<ExportStatement>node).members, callback)
      filterAST((<ExportStatement>node).path, callback)
      break
    case NodeKind.ExportDefault:
      filterAST((<ExportDefaultStatement>node).declaration, callback)
      break
    case NodeKind.ExportImport:
      filterAST((<ExportImportStatement>node).name, callback)
      filterAST((<ExportImportStatement>node).externalName, callback)
      break
    case NodeKind.Expression:
      filterAST((<ExpressionStatement>node).expression, callback)
      break
    case NodeKind.For:
      filterAST((<ForStatement>node).initializer, callback)
      filterAST((<ForStatement>node).condition, callback)
      filterAST((<ForStatement>node).incrementor, callback)
      filterAST((<ForStatement>node).body, callback)
      break
    case NodeKind.ForOf:
      filterAST((<ForOfStatement>node).variable, callback)
      filterAST((<ForOfStatement>node).iterable, callback)
      filterAST((<ForOfStatement>node).body, callback)
      break
    case NodeKind.If:
      filterAST((<IfStatement>node).condition, callback)
      filterAST((<IfStatement>node).ifTrue, callback)
      filterAST((<IfStatement>node).ifFalse, callback)
      break
    case NodeKind.Import:
      filterAST((<ImportStatement>node).declarations, callback)
      filterAST((<ImportStatement>node).namespaceName, callback)
      filterAST((<ImportStatement>node).path, callback)
      break
    case NodeKind.Return:
      filterAST((<ReturnStatement>node).value, callback)
      break
    case NodeKind.Switch:
      filterAST((<SwitchStatement>node).condition, callback)
      filterAST((<SwitchStatement>node).cases, callback)
      break
    case NodeKind.Throw:
      filterAST((<ThrowStatement>node).value, callback)
      break
    case NodeKind.Try:
      filterAST((<TryStatement>node).bodyStatements, callback)
      filterAST((<TryStatement>node).catchVariable, callback)
      filterAST((<TryStatement>node).catchStatements, callback)
      filterAST((<TryStatement>node).finallyStatements, callback)
      break
    case NodeKind.Variable:
      filterAST((<VariableStatement>node).decorators, callback)
      filterAST((<VariableStatement>node).declarations, callback)
      break
    case NodeKind.Void:
      filterAST((<VoidStatement>node).expression, callback)
      break
    case NodeKind.While:
      filterAST((<WhileStatement>node).condition, callback)
      filterAST((<WhileStatement>node).body, callback)
      break
    case NodeKind.Module:
      break
    case NodeKind.ClassDeclaration:
      filterAST((<ClassDeclaration>node).name, callback)
      filterAST((<ClassDeclaration>node).decorators, callback)
      filterAST((<ClassDeclaration>node).typeParameters, callback)
      filterAST((<ClassDeclaration>node).extendsType, callback)
      filterAST((<ClassDeclaration>node).implementsTypes, callback)
      filterAST((<ClassDeclaration>node).members, callback)
      break
    case NodeKind.EnumDeclaration:
      filterAST((<EnumDeclaration>node).name, callback)
      filterAST((<EnumDeclaration>node).decorators, callback)
      filterAST((<EnumDeclaration>node).values, callback)
      break
    case NodeKind.EnumValueDeclaration:
      filterAST((<EnumValueDeclaration>node).name, callback)
      filterAST((<EnumValueDeclaration>node).initializer, callback)
      break
    case NodeKind.FieldDeclaration:
      filterAST((<FieldDeclaration>node).name, callback)
      filterAST((<FieldDeclaration>node).decorators, callback)
      filterAST((<FieldDeclaration>node).type, callback)
      filterAST((<FieldDeclaration>node).initializer, callback)
      break
    case NodeKind.FunctionDeclaration:
      filterAST((<FunctionDeclaration>node).name, callback)
      filterAST((<FunctionDeclaration>node).decorators, callback)
      filterAST((<FunctionDeclaration>node).typeParameters, callback)
      filterAST((<FunctionDeclaration>node).signature, callback)
      filterAST((<FunctionDeclaration>node).body, callback)
      break
    case NodeKind.ImportDeclaration:
      filterAST((<ImportDeclaration>node).name, callback)
      filterAST((<ImportDeclaration>node).foreignName, callback)
      break
    case NodeKind.InterfaceDeclaration:
      filterAST((<InterfaceDeclaration>node).name, callback)
      filterAST((<InterfaceDeclaration>node).decorators, callback)
      filterAST((<InterfaceDeclaration>node).typeParameters, callback)
      filterAST((<InterfaceDeclaration>node).extendsType, callback)
      filterAST((<InterfaceDeclaration>node).implementsTypes, callback)
      filterAST((<InterfaceDeclaration>node).members, callback)
      break
    case NodeKind.MethodDeclaration:
      filterAST((<MethodDeclaration>node).name, callback)
      filterAST((<MethodDeclaration>node).decorators, callback)
      filterAST((<MethodDeclaration>node).typeParameters, callback)
      filterAST((<MethodDeclaration>node).signature, callback)
      filterAST((<MethodDeclaration>node).body, callback)
      break
    case NodeKind.NamespaceDeclaration:
      filterAST((<NamespaceDeclaration>node).name, callback)
      filterAST((<NamespaceDeclaration>node).decorators, callback)
      filterAST((<NamespaceDeclaration>node).members, callback)
      break
    case NodeKind.TypeDeclaration:
      filterAST((<TypeDeclaration>node).name, callback)
      filterAST((<TypeDeclaration>node).decorators, callback)
      filterAST((<TypeDeclaration>node).typeParameters, callback)
      filterAST((<TypeDeclaration>node).type, callback)
      break
    case NodeKind.VariableDeclaration:
      filterAST((<VariableDeclaration>node).name, callback)
      filterAST((<VariableDeclaration>node).decorators, callback)
      filterAST((<VariableDeclaration>node).type, callback)
      filterAST((<VariableDeclaration>node).initializer, callback)
      break
    case NodeKind.Decorator:
      filterAST((<DecoratorNode>node).name, callback)
      filterAST((<DecoratorNode>node).args, callback)
      break
    case NodeKind.ExportMember:
      filterAST((<ExportMember>node).localName, callback)
      filterAST((<ExportMember>node).exportedName, callback)
      break
    case NodeKind.SwitchCase:
      filterAST((<SwitchCase>node).label, callback)
      filterAST((<SwitchCase>node).statements, callback)
      break
    case NodeKind.IndexSignature:
      filterAST((<IndexSignatureNode>node).keyType, callback)
      filterAST((<IndexSignatureNode>node).valueType, callback)
      break
    case NodeKind.Comment:
      break

    default:
      console.warn('Unrecognised node kind', node.kind)
      // console.log(node)
  }

  return callback(node)
}
