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
  return (flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
}

/**
 * Returns true if the node is a constructor method.
 */
export function isConst(flags: number): boolean {
  return (flags & CommonFlags.CONST) === CommonFlags.CONST
}

/**
 * Returns true if the node is a constructor method.
 */
export function isConstructor(flags: number): boolean {
  return (flags & CommonFlags.CONSTRUCTOR) === CommonFlags.CONSTRUCTOR
}

/**
 * Returns true if the node exported from its module.
 */
export function isExported(flags: number): boolean {
  return (flags & CommonFlags.EXPORT) === CommonFlags.EXPORT
}

/**
 * Returns true if the node has a private modifier.
 */
export function isPrivate(flags: number): boolean {
  return (flags & CommonFlags.PRIVATE) === CommonFlags.PRIVATE
}

/**
 * Returns true if the node has a protected modifier.
 */
export function isProtected(flags: number): boolean {
  return (flags & CommonFlags.PROTECTED) === CommonFlags.PROTECTED
}

/**
 * Returns true if the node is a static method.
 */
export function isStatic(flags: number): boolean {
  return (flags & CommonFlags.STATIC) === CommonFlags.STATIC
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
    case NodeKind.SOURCE:
      filterAST((<Source>node).statements, callback)
      break
    case NodeKind.NAMEDTYPE:
      filterAST((<NamedTypeNode>node).name, callback)
      filterAST((<NamedTypeNode>node).typeArguments, callback)
      break
    case NodeKind.FUNCTIONTYPE:
      filterAST((<FunctionTypeNode>node).parameters, callback)
      filterAST((<FunctionTypeNode>node).returnType, callback)
      filterAST((<FunctionTypeNode>node).explicitThisType, callback)
      break
    case NodeKind.TYPENAME:
      filterAST((<TypeName>node).identifier, callback)
      filterAST((<TypeName>node).next, callback)
      break
    case NodeKind.TYPEPARAMETER:
      filterAST((<TypeParameterNode>node).name, callback)
      filterAST((<TypeParameterNode>node).extendsType, callback)
      filterAST((<TypeParameterNode>node).defaultType, callback)
      break
    case NodeKind.PARAMETER:
      filterAST((<ParameterNode>node).name, callback)
      filterAST((<ParameterNode>node).type, callback)
      filterAST((<ParameterNode>node).initializer, callback)
      filterAST((<ParameterNode>node).implicitFieldDeclaration, callback)
      break;
    case NodeKind.IDENTIFIER:
      break
    case NodeKind.ASSERTION:
      filterAST((<AssertionExpression>node).expression, callback)
      filterAST((<AssertionExpression>node).toType, callback)
      break    
    case NodeKind.BINARY:
      filterAST((<BinaryExpression>node).left, callback)
      filterAST((<BinaryExpression>node).right, callback)
      break
    case NodeKind.CALL:
      filterAST((<CallExpression>node).expression, callback)
      filterAST((<CallExpression>node).typeArguments, callback)
      filterAST((<CallExpression>node).args, callback)
      break
    case NodeKind.CLASS:
      filterAST((<ClassExpression>node).declaration, callback)
      break
    case NodeKind.COMMA:
      filterAST((<CommaExpression>node).expressions, callback)
      break
    case NodeKind.ELEMENTACCESS:
      filterAST((<ElementAccessExpression>node).expression, callback)
      filterAST((<ElementAccessExpression>node).elementExpression, callback)
      break
    case NodeKind.FALSE:
      break
    case NodeKind.FUNCTION:
      filterAST((<FunctionExpression>node).declaration, callback)
      break
    case NodeKind.INSTANCEOF:
      filterAST((<InstanceOfExpression>node).expression, callback)
      filterAST((<InstanceOfExpression>node).isType, callback)
      break
    case NodeKind.LITERAL:
      break
    case NodeKind.NEW:
      filterAST((<NewExpression>node).typeName, callback)
      filterAST((<NewExpression>node).typeArguments, callback)
      filterAST((<NewExpression>node).args, callback)
      break
    case NodeKind.NULL:
      break
    case NodeKind.OMITTED:
      break
    case NodeKind.PARENTHESIZED:
      filterAST((<ParenthesizedExpression>node).expression, callback)
      break
    case NodeKind.PROPERTYACCESS:
      filterAST((<PropertyAccessExpression>node).expression, callback)
      filterAST((<PropertyAccessExpression>node).property, callback)
      break
    case NodeKind.TERNARY:
      filterAST((<TernaryExpression>node).condition, callback)
      filterAST((<TernaryExpression>node).ifThen, callback)
      filterAST((<TernaryExpression>node).ifElse, callback)
      break
    case NodeKind.SUPER:
      break
    case NodeKind.THIS:
      break
    case NodeKind.TRUE:
      break
    case NodeKind.CONSTRUCTOR:
      break
    case NodeKind.UNARYPOSTFIX:
      filterAST((<UnaryPostfixExpression>node).operand, callback)
      break
    case NodeKind.UNARYPREFIX:
      filterAST((<UnaryPrefixExpression>node).operand, callback)
      break
    case NodeKind.COMPILED:
      break
    case NodeKind.BLOCK:
      filterAST((<BlockStatement>node).statements, callback)
      break
    case NodeKind.BREAK:
      filterAST((<BreakStatement>node).label, callback)
      break
    case NodeKind.CONTINUE:
      filterAST((<ContinueStatement>node).label, callback)
      break
    case NodeKind.DO:
      filterAST((<DoStatement>node).statement, callback)
      filterAST((<DoStatement>node).condition, callback)
      break
    case NodeKind.EMPTY:
      break
    case NodeKind.EXPORT:
      filterAST((<ExportStatement>node).members, callback)
      filterAST((<ExportStatement>node).path, callback)
      break
    case NodeKind.EXPORTDEFAULT:
      filterAST((<ExportDefaultStatement>node).declaration, callback)
      break
    case NodeKind.EXPORTIMPORT:
      filterAST((<ExportImportStatement>node).name, callback)
      filterAST((<ExportImportStatement>node).externalName, callback)
      break
    case NodeKind.EXPRESSION:
      filterAST((<ExpressionStatement>node).expression, callback)
      break
    case NodeKind.FOR:
      filterAST((<ForStatement>node).initializer, callback)
      filterAST((<ForStatement>node).condition, callback)
      filterAST((<ForStatement>node).incrementor, callback)
      filterAST((<ForStatement>node).statement, callback)
      break
    case NodeKind.FOROF:
      filterAST((<ForOfStatement>node).variable, callback)
      filterAST((<ForOfStatement>node).iterable, callback)
      filterAST((<ForOfStatement>node).statement, callback)
      break
    case NodeKind.IF:
      filterAST((<IfStatement>node).condition, callback)
      filterAST((<IfStatement>node).ifTrue, callback)
      filterAST((<IfStatement>node).ifFalse, callback)
      break
    case NodeKind.IMPORT:
      filterAST((<ImportStatement>node).declarations, callback)
      filterAST((<ImportStatement>node).namespaceName, callback)
      filterAST((<ImportStatement>node).path, callback)
      break
    case NodeKind.RETURN:
      filterAST((<ReturnStatement>node).value, callback)
      break
    case NodeKind.SWITCH:
      filterAST((<SwitchStatement>node).condition, callback)
      filterAST((<SwitchStatement>node).cases, callback)
      break
    case NodeKind.THROW:
      filterAST((<ThrowStatement>node).value, callback)
      break
    case NodeKind.TRY:
      filterAST((<TryStatement>node).statements, callback)
      filterAST((<TryStatement>node).catchVariable, callback)
      filterAST((<TryStatement>node).catchStatements, callback)
      filterAST((<TryStatement>node).finallyStatements, callback)
      break
    case NodeKind.VARIABLE:
      filterAST((<VariableStatement>node).decorators, callback)
      filterAST((<VariableStatement>node).declarations, callback)
      break
    case NodeKind.VOID:
      filterAST((<VoidStatement>node).expression, callback)
      break
    case NodeKind.WHILE:
      filterAST((<WhileStatement>node).condition, callback)
      filterAST((<WhileStatement>node).statement, callback)
      break
    case NodeKind.MODULE:
      break
    case NodeKind.CLASSDECLARATION:
      filterAST((<ClassDeclaration>node).name, callback)
      filterAST((<ClassDeclaration>node).decorators, callback)
      filterAST((<ClassDeclaration>node).typeParameters, callback)
      filterAST((<ClassDeclaration>node).extendsType, callback)
      filterAST((<ClassDeclaration>node).implementsTypes, callback)
      filterAST((<ClassDeclaration>node).members, callback)
      break
    case NodeKind.ENUMDECLARATION:
      filterAST((<EnumDeclaration>node).name, callback)
      filterAST((<EnumDeclaration>node).decorators, callback)
      filterAST((<EnumDeclaration>node).values, callback)
      break
    case NodeKind.ENUMVALUEDECLARATION:
      filterAST((<EnumValueDeclaration>node).name, callback)
      filterAST((<EnumValueDeclaration>node).initializer, callback)
      break
    case NodeKind.FIELDDECLARATION:
      filterAST((<FieldDeclaration>node).name, callback)
      filterAST((<FieldDeclaration>node).decorators, callback)
      filterAST((<FieldDeclaration>node).type, callback)
      filterAST((<FieldDeclaration>node).initializer, callback)
      break
    case NodeKind.FUNCTIONDECLARATION:
      filterAST((<FunctionDeclaration>node).name, callback)
      filterAST((<FunctionDeclaration>node).decorators, callback)
      filterAST((<FunctionDeclaration>node).typeParameters, callback)
      filterAST((<FunctionDeclaration>node).signature, callback)
      filterAST((<FunctionDeclaration>node).body, callback)
      break
    case NodeKind.IMPORTDECLARATION:
      filterAST((<ImportDeclaration>node).name, callback)
      filterAST((<ImportDeclaration>node).foreignName, callback)
      break
    case NodeKind.INTERFACEDECLARATION:
      filterAST((<InterfaceDeclaration>node).name, callback)
      filterAST((<InterfaceDeclaration>node).decorators, callback)
      filterAST((<InterfaceDeclaration>node).typeParameters, callback)
      filterAST((<InterfaceDeclaration>node).extendsType, callback)
      filterAST((<InterfaceDeclaration>node).implementsTypes, callback)
      filterAST((<InterfaceDeclaration>node).members, callback)
      break
    case NodeKind.METHODDECLARATION:
      filterAST((<MethodDeclaration>node).name, callback)
      filterAST((<MethodDeclaration>node).decorators, callback)
      filterAST((<MethodDeclaration>node).typeParameters, callback)
      filterAST((<MethodDeclaration>node).signature, callback)
      filterAST((<MethodDeclaration>node).body, callback)
      break
    case NodeKind.NAMESPACEDECLARATION:
      filterAST((<NamespaceDeclaration>node).name, callback)
      filterAST((<NamespaceDeclaration>node).decorators, callback)
      filterAST((<NamespaceDeclaration>node).members, callback)
      break
    case NodeKind.TYPEDECLARATION:
      filterAST((<TypeDeclaration>node).name, callback)
      filterAST((<TypeDeclaration>node).decorators, callback)
      filterAST((<TypeDeclaration>node).typeParameters, callback)
      filterAST((<TypeDeclaration>node).type, callback)
      break
    case NodeKind.VARIABLEDECLARATION:
      filterAST((<VariableDeclaration>node).name, callback)
      filterAST((<VariableDeclaration>node).decorators, callback)
      filterAST((<VariableDeclaration>node).type, callback)
      filterAST((<VariableDeclaration>node).initializer, callback)
      break
    case NodeKind.DECORATOR:
      filterAST((<DecoratorNode>node).name, callback)
      filterAST((<DecoratorNode>node).args, callback)
      break
    case NodeKind.EXPORTMEMBER:
      filterAST((<ExportMember>node).localName, callback)
      filterAST((<ExportMember>node).exportedName, callback)
      break
    case NodeKind.SWITCHCASE:
      filterAST((<SwitchCase>node).label, callback)
      filterAST((<SwitchCase>node).statements, callback)
      break
    case NodeKind.INDEXSIGNATURE:
      filterAST((<IndexSignatureNode>node).keyType, callback)
      filterAST((<IndexSignatureNode>node).valueType, callback)
      break
    case NodeKind.COMMENT:
      break

    default:
      console.warn('Unrecognised node kind', node.kind)
      console.log(node)
  }

  return callback(node)
}
