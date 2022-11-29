import {
  Abi,
  ClassNode,
  CodeKind,
  FieldNode,
  FunctionNode,
  ObjectNode,
  MethodNode,
  ImportNode,
} from "./types.js"

/**
 * Finds an exported Class from the given ABI by it's name.
 * An error is thrown if an error message is given and no class is found.
 */
export function findClass(abi: Abi, name: string): ClassNode | void;
export function findClass(abi: Abi, name: string, error: string): ClassNode;
export function findClass(abi: Abi, name: string, error?: string): ClassNode | void {
  const exp = abi.exports.find(({ kind, code }) => kind === CodeKind.CLASS && code.name === name)
  return exp ? exp.code as ClassNode : maybeThrow(error)
}

/**
 * Finds an exported Function from the given ABI by it's name.
 * An error is thrown if an error message is given and no function is found.
 */
export function findFunction(abi: Abi, name: string): FunctionNode | void;
export function findFunction(abi: Abi, name: string, error: string): FunctionNode;
export function findFunction(abi: Abi, name: string, error?: string): FunctionNode | void {
  const exp = abi.exports.find(({ kind, code }) => kind === CodeKind.FUNCTION && code.name === name)
  return exp ? exp.code as FunctionNode : maybeThrow(error)
}

/**
 * Finds an import from the given ABI by it's name.
 * An error is thrown if an error message is given and no import is found.
 */
export function findImport(abi: Abi, name: string): ImportNode | void;
export function findImport(abi: Abi, name: string, error: string): ImportNode;
export function findImport(abi: Abi, name: string, error?: string): ImportNode | void {
  return abi.imports.find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * Finds a plain object from the given ABI by it's name.
 * An error is thrown if an error message is given and no object is found.
 */
export function findObject(abi: Abi, name: string): ObjectNode | void;
export function findObject(abi: Abi, name: string, error: string): ObjectNode;
export function findObject(abi: Abi, name: string, error?: string): ObjectNode | void {
  return abi.objects.find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * Finds a field from the given Class or Object by it's name.
 * An error is thrown if an error message is given and no field is found.
 */
export function findField(obj: ClassNode | ObjectNode, name: string): FieldNode | void;
export function findField(obj: ClassNode | ObjectNode, name: string, error: string): FieldNode;
export function findField(obj: ClassNode | ObjectNode, name: string, error?: string): FieldNode | void {
  return obj.fields.find(obj => obj.name === name) || maybeThrow(error)
}

/**
 * Finds a method from the given Class by it's name.
 * An error is thrown if an error message is given and no field is found.
 */
export function findMethod(obj: ClassNode, name: string): MethodNode | void;
export function findMethod(obj: ClassNode, name: string, error: string): MethodNode;
export function findMethod(obj: ClassNode, name: string, error?: string): MethodNode | void {
  return obj.methods.find(obj => obj.name === name) || maybeThrow(error)
}

// Throws an error if a string is given
function maybeThrow(error?: string) {
  if (typeof error === 'string') throw new Error(error)
}
