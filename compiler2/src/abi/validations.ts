import {
  Abi,
  ObjectNode,
  FieldNode,
  MethodNode,
  TypeNode
} from './types.js'

/**
 * Validates the given object has a valid ABI interface
 */
export function validateAbi(obj: any): obj is Abi {
  return "version" in obj &&
    Array.isArray(obj.objects) && obj.objects.every(validateObjectNode)
}

/**
 * Validates the given object has a valid Object Node interface
 */
export function validateObjectNode(obj: any): obj is ObjectNode {
  return "kind" in obj &&
    "name" in obj &&
    "extends" in obj &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode) &&
    Array.isArray(obj.methods) && obj.methods.every(validateMethodNode)
}

/**
 * Validates the given object has a valid Field Node interface
 */
export function validateFieldNode(obj: any): obj is FieldNode {
  return "name" in obj && "type" in obj && validateTypeNode(obj.type)
}

/**
 * Validates the given object has a valid Method Node interface
 */
export function validateMethodNode(obj: any): obj is MethodNode {
  return "kind" in obj &&
    "name" in obj &&
    Array.isArray(obj.args) && obj.args.every(validateFieldNode) &&
    "rtype" in obj && (obj.rtype === null || validateTypeNode(obj.rtype))
}

/**
 * Validates the given object has a valid Type Node interface
 */
export function validateTypeNode(obj: any): obj is TypeNode {
  return "name" in obj &&
  Array.isArray(obj.args) && obj.args.every(validateTypeNode)
}
