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
}

/**
 * ABI interface
 */
export interface Abi {
  version: number;
  exports: ExportNode[];
  imports: ImportNode[];
  objects: ObjectNode[];
  typeIds: TypeIds;
}

/**
 * Export interface
 */
export interface ExportNode {
  kind: CodeKind;
  code: ClassNode | FunctionNode;
}

/**
 * Import interface
 */
export interface ImportNode {
  kind: CodeKind;
  name: string;
  origin: string;
}

/**
 * Class interface
 */
export interface ClassNode {
  name: string;
  extends: string | null;
  fields: FieldNode[];
  methods: MethodNode[];
}

/**
 * Object interface
 * 
 * As the Class interface, minus any methods.
 */
export interface ObjectNode extends Omit<ClassNode, 'methods'> {}

/**
 * Function interface
 */
export interface FunctionNode {
  name: string;
  args: FieldNode[];
  rtype: TypeNode;
}

/**
 * Method interface
 * 
 * As the Function interface, with additional kind prop and rtype can be null/
 */
export interface MethodNode extends Omit<FunctionNode, 'rtype'> {
  kind: MethodKind;
  rtype: TypeNode | null;
}

/**
 * Field interface
 */
export interface FieldNode {
  name: string;
  type: TypeNode;
}

/**
 * Type interface
 */
export interface TypeNode {
  name: string;
  args: TypeNode[];
}

/**
 * Runtime type IDs
 */
export interface TypeIds {
  [type: string]: number;
}

/**
 * ABI CBOR type
 */
export type AbiCbor = [number, ExportCbor[], ImportCbor[], ObjectCbor[], TypeIds]

/**
 * Export CBOR type
 */
export type ExportCbor = [number, ClassCbor | FunctionCbor]

/**
 * Import CBOR type
 */
export type ImportCbor = [number, string, ArrayBuffer]

/**
 * Class CBOR type
 */
export type ClassCbor = [string, string | null, FieldCbor[], MethodCbor[]]

/**
 * Object CBOR type
 */
export type ObjectCbor = [string, string | null, FieldCbor[]]

/**
 * Function CBOR type
 */
export type FunctionCbor = [string, FieldCbor[], TypeCbor]

/**
 * Method CBOR type
 */
export type MethodCbor = [number, string, FieldCbor[], TypeCbor | null]

/**
 * Field CBOR type
 */
export type FieldCbor = [string, TypeCbor]

/**
 * Type CBOR type
 */
export type TypeCbor = [string, TypeCbor[]]
