import { CBOR, Sequence } from 'cbor-redux'
import { hex } from '@scure/base'

import {
  Abi,
  AbiCbor,
  ObjectCbor,
  ObjectNode,
  FieldCbor,
  FieldNode,
  MethodCbor,
  MethodNode,
  TypeCbor,
  TypeNode,
  FunctionCbor,
  FunctionNode,
  ExportCbor,
  ExportNode,
  ClassNode,
  CodeKind,
  ClassCbor,
  ImportCbor,
  ImportNode,
} from './abi/types.js'

import { validateAbi } from './abi/validations.js'

export * from './abi/types.js'
export * from './abi/query.js'
export * from './abi/validations.js'

/**
 * Parses the given CBOR data to an ABI interface.
 */
export function abiFromCbor(cbor: ArrayBuffer): Abi {
  const seq = CBOR.decode(cbor, null, { mode: 'sequence'})
  const [version, exports, imports, objects, typeIds] = seq.data as AbiCbor
  
  const abi = {
    version,
    exports: exports.map(cborToExport),
    imports: imports.map(cborToImport),
    objects: objects.map(cborToObject),
    typeIds,
  }

  if (validateAbi(abi)) {
    return abi
  } else {
    throw new Error('invalid abi cbor data')
  }
}

/**
 * Parses the given JSON data to an ABI interface.
 */
export function abiFromJson(json: string): Abi {
  const abi = JSON.parse(json)
  if (validateAbi(abi)) {
    return abi
  } else {
    throw new Error('invalid abi json string')
  }
}

/**
 * Serializes the given ABI interface to CBOR data.
 */
export function abiToCbor(abi: Abi): ArrayBuffer {
  const seq = Sequence.from([
    abi.version,
    abi.exports.map(cborFromExport),
    abi.imports.map(cborFromImport),
    abi.objects.map(cborFromObject),
    abi.typeIds,
  ])
  return CBOR.encode(seq)
}

/**
 * Serializes the given ABI interface to JSON data.
 */
export function abiToJson(abi: Abi, space: number = 0): string {
  const isImport = (val: any): boolean => {
    return typeof val.kind === 'number' && typeof val.origin === 'string'
  }

  return JSON.stringify(abi, function(key, val) {
    if (key === 'node' || (key === 'code' && isImport(this))) {
      return undefined
    } else {
      return val
    }
  }, space)
}

/**
 * Normalizes a types name by concatenating type args (generics)
 * 
 * Example: `Map<u32,string>`
 */
export function normalizeTypeName(type: TypeNode | null): string {
  if (!type) return ''
  const args = type.args.length ? `<${ type.args.map(normalizeTypeName).join(',') }>` : ''
  return type.name + args
}

// Casts an ExportNode object into an array for CBOR serialization
function cborFromExport({ kind, code }: ExportNode): ExportCbor {
  let codeCbor: ClassCbor | FunctionCbor;
  switch (kind) {
    case CodeKind.CLASS:
      codeCbor = cborFromClass(code as ClassNode)
      break
    case CodeKind.FUNCTION:
      codeCbor = cborFromFunction(code as FunctionNode)
      break
    default:
      // todo - interfaces?
      throw new Error('unsupported code kind')
  }

  return [
    kind,
    codeCbor
  ]
}

// Casts an ImportNode object into an array for CBOR serialization
function cborFromImport({ kind, name, origin }: ImportNode): ImportCbor {
  return [
    kind,
    name,
    hex.decode(origin).buffer
  ]
}

// Casts a ClassNode object into an array for CBOR serialization
function cborFromClass({ name, extends: ext, fields, methods }: ClassNode): ClassCbor {
  return [
    name,
    ext,
    fields.map(cborFromField),
    methods.map(cborFromMethod),
  ]
}

// Casts an ObjectNode object into an array for CBOR serialization
function cborFromObject({ name, extends: ext, fields }: ObjectNode): ObjectCbor {
  return [
    name,
    ext,
    fields.map(cborFromField),
  ]
}

// Casts a FunctionNode object into an array for CBOR serialization
function cborFromFunction({ name, args, rtype }: FunctionNode): FunctionCbor {
  return [
    name,
    args.map(cborFromField),
    cborFromType(rtype)
  ]
}

// Casts a MethodNode object into an array for CBOR serialization
function cborFromMethod({ kind, name, args, rtype }: MethodNode): MethodCbor {
  return [
    kind,
    name,
    args.map(cborFromField),
    rtype ? cborFromType(rtype) : null,
  ]
}

// Casts a FieldNode object into an array for CBOR serialization
function cborFromField({ name, type }: FieldNode): FieldCbor {
  return [
    name,
    cborFromType(type)
  ]
}

// Casts a TypeNode object into an array for CBOR serialization
function cborFromType({ name, args }: TypeNode): TypeCbor {
  return [
    name,
    args.map(cborFromType)
  ]
}

// Casts the CBOR array to an ExportNode object.
function cborToExport([kind, codeCbor]: ExportCbor): ExportNode {
  let code: ClassNode | FunctionNode;
  switch (kind) {
    case CodeKind.CLASS:
      code = cborToClass(codeCbor as ClassCbor)
      break
    case CodeKind.FUNCTION:
      code = cborToFunction(codeCbor as FunctionCbor)
      break
    default:
      // todo - interfaces?
      throw new Error('unsupported code kind')
  }

  return {
    kind,
    code,
  }
}

// Casts the CBOR array to an ImportNode object.
function cborToImport([kind, name, origin]: ImportCbor): ImportNode {
  return {
    kind,
    name,
    origin: hex.encode(new Uint8Array(origin))
  }
}

// Casts the CBOR array to a ClassNode object.
function cborToClass([name, ext, fields, methods]: ClassCbor): ClassNode {
  return {
    name,
    extends: ext,
    fields: fields.map(cborToField),
    methods: methods.map(cborToMethod),
  }
}

// Casts the CBOR array to an ObjectNode object.
function cborToObject([name, ext, fields]: ObjectCbor): ObjectNode {
  return {
    name,
    extends: ext,
    fields: fields.map(cborToField),
  }
}

// Casts the CBOR array to a FunctionNode object.
function cborToFunction([name, args, rtype]: FunctionCbor): FunctionNode {
  return {
    name,
    args: args.map(cborToField),
    rtype: cborToType(rtype),
  }
}

// Casts the CBOR array to a MethodNode object.
function cborToMethod([kind, name, args, rtype]: MethodCbor): MethodNode {
  return {
    kind,
    name,
    args: args.map(cborToField),
    rtype: rtype ? cborToType(rtype) : null
  }
}

// Casts the CBOR array to a FieldNode object.
function cborToField([name, type]: FieldCbor): FieldNode {
  return {
    name,
    type: cborToType(type),
  }
}

// Casts the CBOR array to a TypeNode object.
function cborToType([name, args]: TypeCbor): TypeNode {
  return {
    name,
    args: args.map(cborToType),
  }
}
