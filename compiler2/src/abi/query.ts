import {
  Abi,
  FieldNode,
  MethodNode,
  ObjectKind,
  ObjectNode
} from "./types.js"

/**
 * TODO
 */
export function allPlainObjects(abi: Abi): ObjectNode[] {
  return abi.objects.filter(obj => obj.kind === ObjectKind.PLAIN)
}

/**
 * TODO
 */
export function allExportedObjects(abi: Abi): ObjectNode[] {
  return abi.objects.filter(obj => obj.kind === ObjectKind.EXPORTED)
}

/**
 * TODO
 */
export function allImportedObjects(abi: Abi): ObjectNode[] {
  return abi.objects.filter(obj => obj.kind === ObjectKind.IMPORTED)
}

/**
 * TODO
 */
export function findExportedObject(abi: Abi, name: string): ObjectNode | void;
export function findExportedObject(abi: Abi, name: string, error: string): ObjectNode;
export function findExportedObject(abi: Abi, name: string, error?: string): ObjectNode | void {
  return allExportedObjects(abi).find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * TODO
 */
export function findObjectField(obj: ObjectNode, name: string): FieldNode | void;
export function findObjectField(obj: ObjectNode, name: string, error: string): FieldNode;
export function findObjectField(obj: ObjectNode, name: string, error?: string): FieldNode | void {
  return obj.fields.find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * TODO
 */
export function findObjectMethod(obj: ObjectNode, name: string): MethodNode | void;
export function findObjectMethod(obj: ObjectNode, name: string, error: string): MethodNode;
export function findObjectMethod(obj: ObjectNode, name: string, error?: string): MethodNode | void {
  return obj.methods.find(obj => obj.name === name) || maybeThrow(error)
}

// TODO
function maybeThrow(error?: string) {
  if (typeof error === 'string') throw new Error(error)
}