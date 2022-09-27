/**
 * ABI interface
 */
export interface Abi {
  version: number;
  rtids: RuntimeIds;
  objects: ObjectNode[];
}

/**
 * TODO
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
  CONSTRUCTOR,
  INSTANCE,
  STATIC,
}

/**
 * ABI CBOR type
 */
export type AbiCbor = [number, RuntimeIds, ObjectCbor[]]

/**
 * Object CBOR type
 */
export type ObjectCbor = [number, string, string | null, FieldCbor[], MethodCbor[]]

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
