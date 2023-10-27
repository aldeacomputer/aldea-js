import {
  Abi,
  ArgNode,
  ClassNode,
  CodeDef,
  CodeKind,
  FieldNode,
  FunctionNode,
  InterfaceNode,
  MethodNode,
  ObjectNode,
  ProxyNode,
  TypeIdNode,
  TypeNode,
} from './types.js'

/**
 * Validates the given object implements the ABI interface
 */
export function validateAbi(obj: any): obj is Abi {
  return typeof obj?.version === 'number' &&
    Array.isArray(obj.exports) && obj.exports.every((v: any) => typeof v === 'number') &&
    Array.isArray(obj.imports) && obj.imports.every((v: any) => typeof v === 'number') &&
    Array.isArray(obj.defs) && obj.defs.every(validateCodeDef) &&
    Array.isArray(obj.typeIds) && obj.typeIds.every(validateTypeIdNode)
}

// Validates the given object implements the ExportNode interface
function validateCodeDef(obj: any): obj is CodeDef {
  switch (obj?.kind) {
    case CodeKind.CLASS:      return validateClassNode(obj)
    case CodeKind.FUNCTION:   return validateFunctionNode(obj)
    case CodeKind.INTERFACE:  return validateInterfaceNode(obj)
    case CodeKind.OBJECT:     return validateObjectNode(obj)
    case CodeKind.PROXY_CLASS:
    case CodeKind.PROXY_FUNCTION:
      return validateProxyNode(obj)
    default:
      return false
  }
}

// TODO
function validateProxyNode(obj: any): obj is ProxyNode {
  return typeof obj?.name === 'string' &&
    typeof obj?.pkg === 'string'
}

// Validates the given object implements the ClassNode interface
function validateClassNode(obj: any): obj is ClassNode {
  return typeof obj?.name === 'string' &&
    typeof obj?.extends === 'string' &&
    Array.isArray(obj.implements) && obj.implements.every((v: any) => typeof v === 'string') &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode) &&
    Array.isArray(obj.methods) && obj.methods.every(validateMethodNode)
}

// Validates the given object implements the FunctionNode interface
function validateFunctionNode(obj: any): obj is FunctionNode {
  return typeof obj?.name === 'string' &&
    Array.isArray(obj.args) && obj.args.every(validateArgNode) &&
    'rtype' in obj && validateTypeNode(obj.rtype)
}

// Validates the given object implements the InterfaceNode interface
function validateInterfaceNode(obj: any): obj is InterfaceNode {
  return typeof obj?.name === 'string' &&
    Array.isArray(obj.extends) && obj.extends.every((v: any) => typeof v === 'string') &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode) &&
    Array.isArray(obj.methods) && obj.methods.every(validateFunctionNode)
}

// Validates the given object implements the ObjectNode interface
function validateObjectNode(obj: any): obj is ObjectNode {
  return typeof obj?.name === 'string' &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode)
}

// Validates the given object implements the FieldNode interface
function validateFieldNode(obj: any): obj is FieldNode {
  return typeof obj?.name === 'string' &&
    'type' in obj && validateTypeNode(obj.type)
}

// Validates the given object implements the MethodNode interface
function validateMethodNode(obj: any): obj is MethodNode {
  return typeof obj?.kind === 'number' &&
    typeof obj?.name === 'string' &&
    Array.isArray(obj.args) && obj.args.every(validateArgNode) &&
    'rtype' in obj && (obj.rtype === null || validateTypeNode(obj.rtype))
}

// Validates the given object implements the FieldNode interface
function validateArgNode(obj: any): obj is ArgNode {
  return typeof obj?.name === 'string' &&
    'type' in obj && validateTypeNode(obj.type)
}

// Validates the given object implements the TypeNode interface
function validateTypeNode(obj: any): obj is TypeNode {
  return typeof obj?.name === 'string' &&
    Array.isArray(obj.args) && obj.args.every(validateTypeNode)
}

// Validates the given entry is a valid TypeId
function validateTypeIdNode(obj: any): obj is TypeIdNode {
  return typeof obj?.id === 'number' && typeof obj?.name === 'string'
}
