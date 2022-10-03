/**
 * Module defines a collection of interfaces extending from ABI nodes, that
 * simply wrap around a native AssemblyScript AST node.
 */
import {
  ClassDeclaration,
  DecoratorNode,
  FieldDeclaration,
  MethodDeclaration,
  NamedTypeNode,
  ParameterNode,
} from 'assemblyscript'

import {
  ObjectNode,
  FieldNode,
  MethodNode,
  TypeNode
} from '../abi/types.js'

/**
 * Object Node wrapping around Class Declaration.
 */
export interface ObjectWrap extends ObjectNode {
  node: ClassDeclaration;
  decorators: DecoratorWrap[];
}

/**
 * Field Node wrapping around Field Declaration or Parameter Node.
 */
export interface FieldWrap extends FieldNode {
  node: FieldDeclaration | ParameterNode;
}

/**
 * Method Node wrapping around Method Declaration.
 */
export interface MethodWrap extends MethodNode {
  node: MethodDeclaration;
  decorators: DecoratorWrap[];
}

/**
 * Type Node wrapping around Named Type Node.
 */
export interface TypeWrap extends TypeNode {
  node: NamedTypeNode;
}

/**
 * Decorator Node.
 */
export interface DecoratorWrap {
  node: DecoratorNode;
  name: string;
  args: string[];
}
