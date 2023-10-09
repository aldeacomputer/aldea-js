import { FieldNode, TypeNode } from '../abi/types.js'

interface AbiSchemeInterface {
  abi: Omit<FieldNode, 'kind'>[],
  abi_import_node: Omit<FieldNode, 'kind'>[],
  abi_object_node: Omit<FieldNode, 'kind'>[],
  abi_type_id: Omit<FieldNode, 'kind'>[],
  abi_class_node: Omit<FieldNode, 'kind'>[],
  abi_function_node: Omit<FieldNode, 'kind'>[],
  abi_interface_node: Omit<FieldNode, 'kind'>[],
  abi_field_node: Omit<FieldNode, 'kind'>[],
  abi_method_node: Omit<FieldNode, 'kind'>[],
  abi_arg_node: Omit<FieldNode, 'kind'>[],
  abi_type_node: Omit<FieldNode, 'kind'>[],
}

/**
 * It's basically, an ABI of the ABI.
 */
export const AbiSchema: AbiSchemeInterface = {
  abi: [
    { name: 'version', type: type('u16') },
    { name: 'exports', type: type('Array', [type('abi_export_node')]) },
    { name: 'imports', type: type('Array', [type('abi_import_node')]) },
    { name: 'objects', type: type('Array', [type('abi_object_node')]) },
    { name: 'typeIds', type: type('Array', [type('abi_type_id')]) },
  ],
  abi_import_node: [
    { name: 'kind', type: type('u8') },
    { name: 'name', type: type('string') },
    { name: 'pkg', type: type('string') }, 
  ],
  abi_object_node: [
    { name: 'name', type: type('string') },
    { name: 'fields', type: type('Array', [type('abi_field_node')]) },
  ],
  abi_type_id: [
    { name: 'id', type: type('u32') },
    { name: 'name', type: type('string') },
  ],
  abi_class_node: [
    { name: 'name', type: type('string') },
    { name: 'extends', type: type('string') },
    { name: 'implements', type: type('Array', [type('abi_type_node')]) },
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
    { name: 'extends', type: type('string', [], true) },
    { name: 'fields', type: type('Array', [type('abi_field_node')]) },
    { name: 'methods', type: type('Array', [type('abi_function_node')]) },
  ],
  abi_field_node: [
    { name: 'kind', type: type('u8') },
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
  ]
}

export const PkgSchema: TypeNode[] = [
  type('Array', [type('string')]),
  type('Map', [type('string'), type('string')]),
]

function type(name: string, args: TypeNode[] = [], nullable: boolean = false): TypeNode {
  return { name, nullable, args }
}
