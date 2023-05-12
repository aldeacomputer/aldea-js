import test from 'ava'
import fs from 'fs'
import { join } from 'path'
import {
  abiFromBin,
  abiFromJson,
  abiToJson,
  abiToBin,
} from '../dist/abi.js'
import { validateAbi } from '../dist/abi/validations.js'

function loadABI(filename) {
  const abiStr = fs.readFileSync(join('./test/abis', filename), 'utf8')
  return JSON.parse(abiStr)
}

const abi1 = loadABI('bcs1.abi.json')
const abi2 = loadABI('bcs2.abi.json')

test('serializes and deserializes abi as binary', t => {
  const bin1 = abiToBin(abi1)
  const bin2 = abiToBin(abi2)
  const res1 = abiFromBin(bin1)
  const res2 = abiFromBin(bin2)
  t.true(bin1 instanceof Uint8Array)
  t.true(bin2 instanceof Uint8Array)
  t.true(validateAbi(res1))
  t.true(validateAbi(res2))
  t.deepEqual(res1, abi1)
  t.deepEqual(res2, abi2)
})

test('serializes and deserializes abi as json', t => {
  const str1 = abiToJson(abi1)
  const str2 = abiToJson(abi2)
  const res1 = abiFromJson(str1)
  const res2 = abiFromJson(str2)
  t.true(typeof str1 === 'string')
  t.true(typeof str2 === 'string')
  t.true(validateAbi(res1))
  t.true(validateAbi(res2))
  t.deepEqual(res1, abi1)
  t.deepEqual(res2, abi2)
})
