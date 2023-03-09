import test from 'ava'
import fs from 'fs'
import { CBOR, Sequence } from 'cbor-redux'
import {
  abiFromCbor,
  abiFromJson,
  abiToJson,
  abiToCbor,
} from '../dist/abi.js'
import { validateAbi } from '../dist/abi/validations.js'

const abi = {
  version: 1,
  exports: [],
  imports: [],
  objects: [],
  typeIds: [],
}

test('not a real test', t => {
  const abiCbor = abiFromCbor(abiToCbor(abi))
  const abiJson = abiFromJson(abiToJson(abi))
  t.deepEqual(abiCbor, abi)
  t.deepEqual(abiJson, abi)

  t.true(validateAbi(abi))
})
