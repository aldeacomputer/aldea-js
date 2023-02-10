import {FieldKind, ImportNode, ObjectNode, TypeNode} from "@aldea/compiler/abi";

export const arrayBufferTypeNode: TypeNode = {name: 'ArrayBuffer', args: []}

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
      type: {
        name: 'u8',
        args: []
      }
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
      type: {
        name: 'usize',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'data',
      type: arrayBufferTypeNode
    }
  ]
}

export const voidNode = {name: '_void', args: []}

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

export const outputTypeNode: TypeNode = { name: 'Output', args: [] }
export const lockTypeNode: TypeNode = { name: 'Lock', args: [] }
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
