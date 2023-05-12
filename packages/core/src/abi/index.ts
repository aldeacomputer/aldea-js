import {
  ClassNode,
  FieldNode,
  FunctionNode,
  InterfaceNode,
  MethodKind,
  MethodNode,
  TypeNode,
} from './types.js'

export * from './query.js'
export * from './types.js'
export * from './validations.js'

/**
 * Normalizes an ABI node name. Can optionally be passed it's parent ClassNode.
 */
export function normalizeNodeName(
  node: ClassNode | FunctionNode | InterfaceNode | FieldNode | MethodNode,
  parent?: ClassNode | InterfaceNode
): string {
  if (parent && parent.fields.includes(node as FieldNode)) {
    return `${parent.name}.${node.name}`
  } else if (parent && parent.methods.includes(node as MethodNode & FunctionNode)) {
    const delim = (<MethodNode>node).kind === MethodKind.INSTANCE ? '$' : '_'
    return parent.name + delim + node.name
  } else {
    return node.name
  }
}

/**
 * Normalizes a types name by concatenating type args (generics)
 * 
 * Example: `Map<u32,string>`
 */
export function normalizeTypeName(type: TypeNode | null): string {
  if (!type) return ''
  const args = type.args.length ? `<${ type.args.map(normalizeTypeName).join(',') }>` : ''
  const nullable = type.nullable ? ' | null' : ''
  return type.name + args + nullable
}
