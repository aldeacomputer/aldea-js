import {FieldKind, ImportNode, ObjectNode, TypeNode} from "@aldea/compiler/abi";

export const outputAbiNode: ObjectNode = {
  name: 'Output',
  extends: null,
  fields: [
    {
      kind: FieldKind.PUBLIC,
      name: 'origin',
      type: {name: 'ArrayBuffer', args: []}
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'location',
      type: {name: 'ArrayBuffer', args: []}
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'classPtr',
      type: {name: 'ArrayBuffer', args: []}
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
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'location',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
    },
    {
      kind: FieldKind.PUBLIC,
      name: 'classPtr',
      type: {
        name: 'ArrayBuffer',
        args: []
      }
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
      type: {
        name: 'ArrayBuffer',
        args: []
      }
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
      type: {
        name: 'ArrayBuffer',
        args: []
      }
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
      type: {
        name: 'ArrayBuffer',
        args: []
      }
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
