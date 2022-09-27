import { CBOR, Sequence } from 'cbor-redux'

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
} from './abi/types.js'

import { validateAbi } from './abi/validations.js'

/**
 * Parses the given CBOR data to an ABI interface.
 */
export function abiFromCbor(cbor: ArrayBuffer): Abi {
  const seq = CBOR.decode(cbor, null, { mode: 'sequence'})
  const [version, rtids, objects] = seq.data as AbiCbor
  
  return {
    version,
    rtids,
    objects: objects.map(objectFromCbor)
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
  const seq = Sequence.from([ abi.version, abi.rtids, abi.objects.map(objectToCbor) ])
  return CBOR.encode(seq)
}

/**
 * Serializes the given ABI interface to JSON data.
 */
export function abiToJson(abi: Abi, space: number = 0): string {
  return JSON.stringify({
    version: abi.version,
    rtids: abi.rtids,
    objects: abi.objects.map(objectToJson)
  }, null, space)
}

// Casts the CBOR array to an Object Node interface.
function objectFromCbor([kind, name, ext, fields, methods]: ObjectCbor): ObjectNode {
  return {
    kind,
    name,
    extends: ext,
    fields: fields.map(fieldFromCbor),
    methods: methods.map(methodFromCbor)
  }
}

// Casts the Object Node interface to a CBOR array.
function objectToCbor(node: ObjectNode): ObjectCbor {
  return [
    node.kind,
    node.name,
    node.extends,
    node.fields.map(fieldToCbor),
    node.methods.map(methodToCbor)
  ]
}

// TODO
function objectToJson(node: ObjectNode): ObjectNode {
  return {
    kind: node.kind,
    name: node.name,
    extends: node.extends,
    fields: node.fields.map(fieldToJson),
    methods: node.methods.map(methodToJson),
  }
}

// Casts the CBOR array to an Field Node interface.
function fieldFromCbor(field: FieldCbor): FieldNode {
  if (field.length === 2) {
    const [name, type] = field as [string, TypeCbor]
    return { name, type: typeFromCbor(type) }
  } else {
    const [kind, name, type] = field as [number, string, TypeCbor]
    return { kind, name, type: typeFromCbor(type) }
  }
}

// Casts the Field Node interface to a CBOR array.
function fieldToCbor(node: FieldNode): FieldCbor {
  if (typeof node.kind === 'number') {
    return [ node.kind, node.name, typeToCbor(node.type) ]
  } else {
    return [ node.name, typeToCbor(node.type) ]
  }
}

// TODO
function fieldToJson(node: FieldNode): FieldNode {
  return {
    kind: node.kind,
    name: node.name,
    type: typeToJson(node.type)
  }
}

// Casts the CBOR array to a Method Node interface.
function methodFromCbor([kind, name, args, rtype]: MethodCbor): MethodNode {
  return {
    kind,
    name,
    args: args.map(fieldFromCbor),
    rtype: rtype ? typeFromCbor(rtype) : null
  }
}

// Casts the Method Node interface to a CBOR array.
function methodToCbor(node: MethodNode): MethodCbor {
  return [
    node.kind,
    node.name,
    node.args.map(fieldToCbor),
    node.rtype ? typeToCbor(node.rtype) : null
  ]
}

// TODO
function methodToJson(node: MethodNode): MethodNode {
  return {
    kind: node.kind,
    name: node.name,
    args: node.args.map(fieldToJson),
    rtype: node.rtype ? typeToJson(node.rtype) : null
  }
}

// Casts the CBOR array to a Type Node interface.
function typeFromCbor([name, args]: TypeCbor): TypeNode {
  return { name, args: args.map(typeFromCbor) }
}

// Casts the Type Node interface to a CBOR array.
function typeToCbor(node: TypeNode): TypeCbor {
  return [ node.name, node.args.map(typeToCbor) ]
}

// TODO
function typeToJson(node: TypeNode): TypeNode {
  return {
    name: node.name,
    args: node.args.map(typeToJson),
  }
}
