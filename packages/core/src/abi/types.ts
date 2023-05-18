/**
 * Code kind
 */
export enum CodeKind {
  CLASS,
  FUNCTION,
  INTERFACE,
}

/**
 * Method kind
 */
export enum MethodKind {
  STATIC,
  CONSTRUCTOR,
  INSTANCE,
  PRIVATE,
  PROTECTED,
}

/**
 * Field kind
 */
 export enum FieldKind {
  PUBLIC,
  PRIVATE,
  PROTECTED,
}

/**
 * ABI interface
 */
export interface Abi {
  version: number;
  exports: ExportNode[];
  imports: ImportNode[];
  objects: ObjectNode[];
  typeIds: TypeIdNode[];
}

/**
 * Export interface
 */
export interface ExportNode {
  kind: CodeKind;
  code: ClassNode | FunctionNode | InterfaceNode;
}

/**
 * Import interface
 */
export interface ImportNode {
  kind: CodeKind;
  name: string;
  pkg: string;
}

/**
 * Class interface
 */
export interface ClassNode {
  name: string;
  extends: string;
  implements: TypeNode[];
  fields: FieldNode[];
  methods: MethodNode[];
}

/**
 * Interface interafce (lol)
 * 
 * As the Class interfacem, but methods are Function interfaces
 */
export interface InterfaceNode {
  name: string;
  extends: string | null;
  fields: FieldNode[];
  methods: FunctionNode[];
}

/**
 * Function interface
 */
export interface FunctionNode {
  name: string;
  args: ArgNode[];
  rtype: TypeNode;
}

/**
 * Object interface
 * 
 * As the Class interface, minus any methods.
 */
export interface ObjectNode {
  name: string;
  fields: FieldNode[];
}

/**
 * Field interface
 */
export interface FieldNode {
  kind: FieldKind;
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
