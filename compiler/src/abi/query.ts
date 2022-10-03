import {
  Abi,
  FieldNode,
  MethodNode,
  ObjectKind,
  ObjectNode
} from "./types.js"

/**
 * Filters and returns the Plain Objects from the given ABI.
 */
export function allPlainObjects(abi: Abi): ObjectNode[] {
  return abi.objects.filter(obj => obj.kind === ObjectKind.PLAIN)
}

/**
 * Filters and returns the Exported Objects from the given ABI.
 */
export function allExportedObjects(abi: Abi): ObjectNode[] {
  return abi.objects.filter(obj => obj.kind === ObjectKind.EXPORTED)
}

/**
 * Filters and returns the Imported Objects from the given ABI.
 */
export function allImportedObjects(abi: Abi): ObjectNode[] {
  return abi.objects.filter(obj => obj.kind === ObjectKind.IMPORTED)
}

/**
 * Finds and returns a Plain Object by its name from the given ABI.
 */
 export function findPlainObject(abi: Abi, name: string): ObjectNode | void;
 export function findPlainObject(abi: Abi, name: string, error: string): ObjectNode;
 export function findPlainObject(abi: Abi, name: string, error?: string): ObjectNode | void {
   return allPlainObjects(abi).find(obj => obj.name === name) || maybeThrow(error)
 }

/**
 * Finds and returns an Exported Object by its name from the given ABI.
 */
export function findExportedObject(abi: Abi, name: string): ObjectNode | void;
export function findExportedObject(abi: Abi, name: string, error: string): ObjectNode;
export function findExportedObject(abi: Abi, name: string, error?: string): ObjectNode | void {
  return allExportedObjects(abi).find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * Finds and returns an Imported Object by its name from the given ABI.
 */
 export function findImportedObject(abi: Abi, name: string): ObjectNode | void;
 export function findImportedObject(abi: Abi, name: string, error: string): ObjectNode;
 export function findImportedObject(abi: Abi, name: string, error?: string): ObjectNode | void {
   return allImportedObjects(abi).find(obj => obj.name === name) || maybeThrow(error)
 }

/**
 * Finds and returns a Field by its name from the given Object.
 */
export function findObjectField(obj: ObjectNode, name: string): FieldNode | void;
export function findObjectField(obj: ObjectNode, name: string, error: string): FieldNode;
export function findObjectField(obj: ObjectNode, name: string, error?: string): FieldNode | void {
  return obj.fields.find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * Finds and returns a Method by its name from the given Object.
 */
export function findObjectMethod(obj: ObjectNode, name: string): MethodNode | void;
export function findObjectMethod(obj: ObjectNode, name: string, error: string): MethodNode;
export function findObjectMethod(obj: ObjectNode, name: string, error?: string): MethodNode | void {
  return obj.methods.find(obj => obj.name === name) || maybeThrow(error)
}

// Throws an error if a string is given
function maybeThrow(error?: string) {
  if (typeof error === 'string') throw new Error(error)
}
