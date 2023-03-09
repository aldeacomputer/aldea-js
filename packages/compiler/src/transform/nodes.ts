/**
 * Module defines a collection of interfaces extending from ABI nodes, that
 * simply wrap around a native AssemblyScript AST node.
 */
import {
  ClassDeclaration,
  DecoratorNode,
  FieldDeclaration,
  InterfaceDeclaration,
  FunctionDeclaration,
  MethodDeclaration,
  NamedTypeNode,
  ParameterNode,
} from 'assemblyscript'

import {
  ClassNode,
  ExportNode,
  FieldNode,
  ArgNode,
  FunctionNode,
  ImportNode,
  MethodNode,
  ObjectNode,
  TypeNode,
  InterfaceNode,
} from '../abi/types.js'

/**
 * ExportWrap - same as ABI ExportNode.
 */
export interface ExportWrap extends ExportNode {}

/**
 * Wraps an ImportNode around a ClassNode or FunctionNode.
 */
export interface ImportWrap extends ImportNode {
  code: ClassWrap | FunctionWrap | InterfaceWrap;
}

/**
 * Wraps an ClassNode around a ClassDeclaration.
 */
export interface ClassWrap extends ClassNode {
  node: ClassDeclaration;
}

/**
 * Wraps an ObjectNode around a ClassDeclaration.
 */
export interface ObjectWrap extends ObjectNode {
  node: ClassDeclaration;
}

/**
 * Wraps a FunctionNode around a FunctionDeclaration.
 */
export interface FunctionWrap extends FunctionNode {
  node: FunctionDeclaration;
}

/**
 * Wraps an InterfaceNode around an InterfaceDeclaration.
 */
export interface InterfaceWrap extends InterfaceNode {
  node: InterfaceDeclaration;
}

/**
 * Wraps an MethodNode around a MethodDeclaration.
 */
export interface MethodWrap extends MethodNode {
  node: MethodDeclaration;
}

/**
 * Wraps an FieldNode around a FieldDeclaration.
 */
export interface FieldWrap extends FieldNode {
  node: FieldDeclaration;
}

/**
 * Wraps an ArgNode around a ParameterNode.
 */
 export interface ArgWrap extends ArgNode {
  node: ParameterNode;
}

/**
 * Wraps an TypeNode around a NamedTypeNode.
 */
export interface TypeWrap extends TypeNode {
  node: NamedTypeNode;
}

/**
 * DecoratorTag interface.
 */
export interface DecoratorTag {
  node: DecoratorNode;
  name: string;
  args: string[];
}
