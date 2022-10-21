/**
 * ABI interface
 */
export interface Abi {
  version: number;
  rtids: RuntimeIds;
  objects: ObjectNode[];
  functions: FunctionNode[];
}

/**
 * Runtime IDs interface
 */
export interface RuntimeIds {
  [type: string]: number;
}

/**
 * Object Node interface
 */
export interface ObjectNode {
  kind: ObjectKind;
  name: string;
  extends: string | null;
  fields: FieldNode[];
  methods: MethodNode[];
}

/**
 * Function Node interface
 */
export interface FunctionNode {
  name: string;
  args: FieldNode[];
  rtype: TypeNode;
}

/**
 * Field Node interface
 */
export interface FieldNode {
  kind?: FieldKind;
  name: string;
  type: TypeNode;
}

/**
 * Method Node interface
 */
export interface MethodNode {
  kind: MethodKind;
  name: string;
  args: FieldNode[];
  rtype: TypeNode | null;
}

/**
 * TYype Node interface
 */
export interface TypeNode {
  name: string;
  args: TypeNode[];
}

/**
 * Object Kind
 */
export enum ObjectKind {
  PLAIN,
  EXPORTED,
  IMPORTED,
}

/**
 * Field Kind
 */
export enum FieldKind {
  PUBLIC,
  PRIVATE,
  PROTECTED,
}

/**
 * Methoid Kind
 */
export enum MethodKind {
  STATIC,
  CONSTRUCTOR,
  INSTANCE,
}

/**
 * ABI CBOR type
 */
export type AbiCbor = [number, RuntimeIds, ObjectCbor[], FunctionCbor[]]

/**
 * Object CBOR type
 */
export type ObjectCbor = [number, string, string | null, FieldCbor[], MethodCbor[]]

/**
 * Function CBOR type
 */
export type FunctionCbor = [string, FieldCbor[], TypeCbor]

/**
 * Field CBOR type
 * 
 * May or may not include intitial Field Kind enum.
 */
export type FieldCbor = [number, string, TypeCbor] | [string, TypeCbor]

/**
 * Method CBOR type
 */
export type MethodCbor = [number, string, FieldCbor[], TypeCbor | null]

/**
 * Type CBOR type
 */
export type TypeCbor = [string, TypeCbor[]]
