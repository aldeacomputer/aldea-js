import { FieldNode, TypeNode } from '../abi/types.js'

interface AbiSchemeInterface {
  abi: FieldNode[],
  abi_class_node: FieldNode[],
  abi_function_node: FieldNode[],
  abi_interface_node: FieldNode[],
  abi_object_node: FieldNode[],
  abi_proxy_node: FieldNode[],
  abi_field_node: FieldNode[],
  abi_method_node: FieldNode[],
  abi_arg_node: FieldNode[],
  abi_type_node: FieldNode[],
  abi_type_id: FieldNode[],
}

/**
 * It's basically, an ABI of the ABI.
 */
export const AbiSchema: AbiSchemeInterface = {
  abi: [
    { name: 'version', type: type('u16') },
    { name: 'exports', type: type('Array', [type('u16')]) },
    { name: 'imports', type: type('Array', [type('u16')]) },
    { name: 'defs',    type: type('Array', [type('abi_code_def')]) },
    { name: 'typeIds', type: type('Array', [type('abi_type_id')]) },
  ],
  abi_class_node: [
    { name: 'name', type: type('string') },
    { name: 'extends', type: type('string') },
    { name: 'implements', type: type('Array', [type('string')]) },
    { name: 'fields', type: type('Array', [type('abi_field_node')]) },
    { name: 'methods', type: type('Array', [type('abi_method_node')]) },
  ],
  abi_function_node: [
    { name: 'name', type: type('string') },
    { name: 'args', type: type('Array', [type('abi_arg_node')]) },
    { name: 'rtype', type: type('abi_type_node') },
  ],
  abi_interface_node: [
    { name: 'name', type: type('string') },
    { name: 'extends', type: type('Array', [type('string')]) },
    { name: 'fields', type: type('Array', [type('abi_field_node')]) },
    { name: 'methods', type: type('Array', [type('abi_function_node')]) },
  ],
  abi_object_node: [
    { name: 'name', type: type('string') },
    { name: 'fields', type: type('Array', [type('abi_field_node')]) },
  ],
  abi_proxy_node: [
    { name: 'name', type: type('string') },
    { name: 'pkg', type: type('string') }, 
  ],
  abi_field_node: [
    { name: 'name', type: type('string') },
    { name: 'type', type: type('abi_type_node') },
  ],
  abi_method_node: [
    { name: 'kind', type: type('u8') },
    { name: 'name', type: type('string') },
    { name: 'args', type: type('Array', [type('abi_arg_node')]) },
    { name: 'rtype', type: type('abi_type_node', [], true) },
  ],
  abi_arg_node: [
    { name: 'name', type: type('string') },
    { name: 'type', type: type('abi_type_node') },
  ],
  abi_type_node: [
    { name: 'name', type: type('string') },
    { name: 'nullable', type: type('bool') },
    { name: 'args', type: type('Array', [type('abi_type_node')]) },
  ],
  abi_type_id: [
    { name: 'id', type: type('u32') },
    { name: 'name', type: type('string') },
  ],
}

export const PkgSchema: TypeNode[] = [
  type('Array', [type('string')]),
  type('Map', [type('string'), type('string')]),
]

function type(name: string, args: TypeNode[] = [], nullable: boolean = false): TypeNode {
  return { name, nullable, args }
}
