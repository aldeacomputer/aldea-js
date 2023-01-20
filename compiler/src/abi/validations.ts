import {
  Abi,
  ExportNode,
  ImportNode,
  ObjectNode,
  FieldNode,
  ArgNode,
  FunctionNode,
  MethodNode,
  TypeNode,
  CodeKind,
  ClassNode,
  InterfaceNode,
} from './types.js'

/**
 * Validates the given object implements the ABI interface
 */
export function validateAbi(obj: any): obj is Abi {
  return "version" in obj &&
    Array.isArray(obj.exports) && obj.exports.every(validateExportNode) &&
    Array.isArray(obj.imports) && obj.imports.every(validateImportNode) &&
    Array.isArray(obj.objects) && obj.objects.every(validateObjectNode) &&
    Object.entries(obj.typeIds).every(validateTypeId)
}

// Validates the given object implements the ExportNode interface
function validateExportNode(obj: any): obj is ExportNode {
  let validateCode: (obj: any) => boolean
  switch (obj?.kind) {
    case CodeKind.CLASS:
      validateCode = validateClassNode
      break
    case CodeKind.FUNCTION:
      validateCode = validateFunctionNode
      break
    case CodeKind.INTERFACE:
      validateCode = validateInterfaceNode
      break
    default:
      validateCode = () => false
  }

  return "kind" in obj &&
    typeof obj.code === 'object' && validateCode(obj.code)
}

// Validates the given object implements the ImportNode interface
function validateImportNode(obj: any): obj is ImportNode {
  return "kind" in obj && "name" in obj && "pkg" in obj
}

// Validates the given object implements the ClassNode interface
function validateClassNode(obj: any): obj is ClassNode {
  return "name" in obj &&
    "extends" in obj &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode) &&
    Array.isArray(obj.methods) && obj.methods.every(validateMethodNode)
}

// Validates the given object implements the ObjectNode interface
function validateObjectNode(obj: any): obj is ObjectNode {
  return "name" in obj &&
    "extends" in obj &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode)
}

// Validates the given object implements the FunctionNode interface
function validateFunctionNode(obj: any): obj is FunctionNode {
  return "name" in obj &&
    Array.isArray(obj.args) && obj.args.every(validateArgNode) &&
    "rtype" in obj && validateTypeNode(obj.rtype)
}

// Validates the given object implements the InterfaceNode interface
function validateInterfaceNode(obj: any): obj is InterfaceNode {
  return "name" in obj &&
    "extends" in obj &&
    Array.isArray(obj.fields) && obj.fields.every(validateFieldNode) &&
    Array.isArray(obj.methods) && obj.methods.every(validateFunctionNode)
}

// Validates the given object implements the MethodNode interface
function validateMethodNode(obj: any): obj is MethodNode {
  return "kind" in obj &&
    "name" in obj &&
    Array.isArray(obj.args) && obj.args.every(validateArgNode) &&
    "rtype" in obj && (obj.rtype === null || validateTypeNode(obj.rtype))
}

// Validates the given object implements the FieldNode interface
function validateFieldNode(obj: any): obj is FieldNode {
  return "kind" in obj &&
    "name" in obj &&
    "type" in obj && validateTypeNode(obj.type)
}

// Validates the given object implements the FieldNode interface
function validateArgNode(obj: any): obj is ArgNode {
  return "name" in obj &&
    "type" in obj && validateTypeNode(obj.type)
}

// Validates the given object implements the TypeNode interface
function validateTypeNode(obj: any): obj is TypeNode {
  return "name" in obj &&
    Array.isArray(obj.args) && obj.args.every(validateTypeNode)
}

// Validates the given entry is a valid TypeId
function validateTypeId([key, val]: [string, any]): boolean {
  return typeof key === 'string' && typeof val === 'number'
}
