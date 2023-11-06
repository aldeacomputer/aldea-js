/**
 * Code kind
 */
export enum CodeKind {
  CLASS,
  FUNCTION,
  INTERFACE,
  OBJECT,
  //ENUM,
  PROXY_CLASS = 100,
  PROXY_FUNCTION,
  PROXY_INTERFACE,
}

/**
 * Method kind
 */
export enum MethodKind {
  PUBLIC,
  PROTECTED,
}

/**
 * ABI interface
 */
export interface Abi {
  version: number;
  exports: number[];
  imports: number[];
  defs: CodeDef[];
  typeIds: TypeIdNode[];
}

/**
 * Code Definition interface
 */
export type CodeDef<T = ClassNode | FunctionNode | InterfaceNode | ObjectNode | ProxyNode> = T
export type ProxyNode = ProxyClassNode | ProxyFunctionNode | ProxyInterfaceNode
export type ExportCode = ClassNode | FunctionNode | InterfaceNode | ObjectNode
export type ImportCode = ProxyNode | ObjectNode

export interface ProxyNodeSchema {
  name: string;
  pkg: string;
}

export interface ClassNodeSchema {
  name: string;
  extends: string;
  implements: string[];
  fields: FieldNode[];
  methods: MethodNode[];
}

export interface FunctionNodeSchema {
  name: string;
  args: ArgNode[];
  rtype: TypeNode;
}

export interface InterfaceNodeSchema {
  name: string;
  extends: string[];
  fields: FieldNode[];
  methods: FunctionNode[];
}

export interface ObjectNodeSchema {
  name: string;
  fields: FieldNode[];
}

/**
 * TODO
 */
export interface ProxyClassNode extends ProxyNodeSchema {
  kind: CodeKind.PROXY_CLASS;
}

/**
 * TODO
 */
export interface ProxyFunctionNode extends ProxyNodeSchema {
  kind: CodeKind.PROXY_FUNCTION;
}

/**
 * TODO
 */
export interface ProxyInterfaceNode extends ProxyNodeSchema {
  kind: CodeKind.PROXY_INTERFACE;
}

/**
 * Class interface
 */
export interface ClassNode extends ClassNodeSchema {
  kind: CodeKind.CLASS;
}



/**
 * Function interface
 */
export interface FunctionNode extends FunctionNodeSchema {
  kind: CodeKind.FUNCTION;
}

/**
 * Interface interafce (lol)
 * 
 * As the Class interface, but methods are Function interfaces
 */
export interface InterfaceNode extends InterfaceNodeSchema {
  kind: CodeKind.INTERFACE;
}

/**
 * Object interface
 * 
 * As the Class interface, minus any methods.
 */
export interface ObjectNode extends ObjectNodeSchema {
  kind: CodeKind.OBJECT;
}

/**
 * Field interface
 */
export interface FieldNode {
  name: string;
  type: TypeNode;
}

/**
 * Method interface
 * 
 * As the Function interface, with additional kind prop and rtype can be null
 */
export interface MethodNode {
  kind: MethodKind;
  name: string;
  args: ArgNode[];
  rtype: TypeNode | null;
}

/**
 * Arg interface
 * 
 * As the Field interface, minus the kind property.
 */
export interface ArgNode {
  name: string;
  type: TypeNode;
}

/**
 * Type interface
 */
export interface TypeNode {
  name: string;
  nullable: boolean;
  args: TypeNode[];
}

/**
 * Runtime type IDs
 */
export interface TypeIdNode {
  id: number;
  name: string;
}
