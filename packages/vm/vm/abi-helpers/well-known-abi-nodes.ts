import {FieldKind, ImportNode, ObjectNode, TypeNode} from "@aldea/compiler/abi";

export const arrayBufferTypeNode: TypeNode = emptyTn('ArrayBuffer')

export const outputAbiNode: ObjectNode = {
  name: 'Output',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'origin',
      type: arrayBufferTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'location',
      type: arrayBufferTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'classPtr',
      type: arrayBufferTypeNode
    }
  ]
}

export const jigInitParamsTypeNode = emptyTn('JigInitParams')

export const jigInitParamsAbiNode: ObjectNode = {
  name: 'JigInitParams',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'origin',
      type: arrayBufferTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'location',
      type: arrayBufferTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'classPtr',
      type: arrayBufferTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'lockType',
      type: emptyTn('u8')
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'lockData',
      type: arrayBufferTypeNode
    },
  ]
}

export const lockAbiNode: ObjectNode = {
  name: 'Lock',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'origin',
      type: arrayBufferTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'type',
      type: emptyTn('usize')
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'data',
      type: arrayBufferTypeNode
    }
  ]
}

export const voidNode = emptyTn('_void')

export const coinNode: ImportNode = {
  name: 'Coin',
  pkg: new Array(32).fill('0').join(''),
  kind: 0
}

export const jigNode: ImportNode = {
  name: 'Jig',
  pkg: new Array(32).fill('0').join(''),
  kind: 0
}

export const outputTypeNode: TypeNode = emptyTn('Output')
export const lockTypeNode: TypeNode = emptyTn('Lock')
export const JIG_TOP_CLASS_NAME = 'Jig'

export const basicJigAbiNode: ObjectNode = {
  name: '__Jig',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: '$output',
      type: outputTypeNode
    },
    {
      kind: FieldKind.PUBLIC,
      name: '$lock',
      type: lockTypeNode
    }
  ]
}

export function emptyTn(name: string): TypeNode {
  return { name, args: [], nullable: false }
}
