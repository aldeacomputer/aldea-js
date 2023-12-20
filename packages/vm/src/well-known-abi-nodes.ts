import {CodeKind, ImportCode, ObjectNode, TypeNode} from "@aldea/core/abi";
import {Pointer} from "@aldea/core";

export const arrayBufferTypeNode: TypeNode = emptyTn('ArrayBuffer')

export const outputAbiNode: ObjectNode = {
  name: 'Output',
  kind: CodeKind.OBJECT,
  fields: [
    {
      name: 'origin',
      type: arrayBufferTypeNode
    },
    {
      name: 'location',
      type: arrayBufferTypeNode
    },
    {
      name: 'classPtr',
      type: arrayBufferTypeNode
    }
  ]
}

export const jigInitParamsTypeNode = emptyTn('JigInitParams')

export const jigInitParamsAbiNode: ObjectNode = {
  name: 'JigInitParams',
  kind: CodeKind.OBJECT,
  fields: [
    {
      name: 'origin',
      type: arrayBufferTypeNode
    },
    {
      name: 'location',
      type: arrayBufferTypeNode
    },
    {
      name: 'classPtr',
      type: arrayBufferTypeNode
    },
    {
      name: 'lockType',
      type: emptyTn('u8')
    },
    {
      name: 'lockData',
      type: arrayBufferTypeNode
    },
  ]
}

export const lockAbiNode: ObjectNode = {
  name: 'Lock',
  kind: CodeKind.OBJECT,
  fields: [
    {
      name: 'origin',
      type: arrayBufferTypeNode
    },
    {
      name: 'type',
      type: emptyTn('usize')
    },
    {
      name: 'data',
      type: arrayBufferTypeNode
    }
  ]
}

export const coinNode: ImportCode = {
  name: 'Coin',
  pkg: new Array(32).fill('0').join(''),
  kind: CodeKind.PROXY_CLASS
}

export const outputTypeNode: TypeNode = emptyTn('Output')
export const lockTypeNode: TypeNode = emptyTn('Lock')

export const basicJigAbiNode: ObjectNode = {
  name: '__Jig',
  kind: CodeKind.OBJECT,
  fields: [
    {
      name: '$output',
      type: outputTypeNode
    },
    {
      name: '$lock',
      type: lockTypeNode
    }
  ]
}

export const bigIntNode: ObjectNode = {
  name: 'BigInt',
  kind: CodeKind.OBJECT,
  fields: [
    {
      name: 'd',
      type: emptyTn('Uint32Array')
    },
    {
      name: 'n',
      type: emptyTn('i32')
    },
    {
      name: 'isNeg',
      type: emptyTn('bool')
    }
  ]
}

export function emptyTn(name: string): TypeNode {
  return { name, args: [], nullable: false }
}

export const BUF_RTID = 1
export const STRING_RTID = 2
export const ARR_HEADER_LENGTH = 16;
export const TYPED_ARR_HEADER_LENGTH = 12;

export const COIN_CLS_PTR = new Pointer(new Uint8Array(32), 0)
// Magic Coin Pkg ID
export const COIN_PKG_ID = new Uint8Array(32).fill(0)
