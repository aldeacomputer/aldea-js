import test from 'ava'
import {
  abiFromCbor,
  abiFromJson,
  abiToJson,
  abiToCbor,
} from '../dist/abi.js'
import { validateAbi } from '../dist/abi/validations.js'

const abi = {
  version: 1,
  objects: [{
    kind: 1,
    name: 'Person',
    extends: null,
    fields: [{
      kind: 0,
      name: 'name',
      type: { name: 'string', args: [] },
    }, {
      kind: 0,
      name: 'age',
      type: { name: 'uint', args: [] },
    }],
    methods: [{
      kind: 0,
      name: 'constructor',
      args: [{
        name: 'name',
        type: { name: 'string', args: [] },
      }],
      rtype: null
    }, {
      kind: 0,
      name: 'rename',
      args: [{
        name: 'name',
        type: { name: 'string', args: [] },
      }],
      rtype: { name: 'void', args: [] },
    }, {
      kind: 1,
      name: 'birthday',
      args: [],
      rtype: { name: 'void', args: [] },
    }]
  }]
}

test('not a real test', t => {
  const abiCbor = abiFromCbor(abiToCbor(abi))
  const abiJson = abiFromJson(abiToJson(abi))
  t.deepEqual(abiCbor, abi)
  t.deepEqual(abiJson, abi)


  t.true(validateAbi(abi))
})
