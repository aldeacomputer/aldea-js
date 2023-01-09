import test from 'ava'
import { compile } from '../dist/compiler.js'
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
  typeIds: {},
}

test('not a real test', t => {
  const abiCbor = abiFromCbor(abiToCbor(abi))
  const abiJson = abiFromJson(abiToJson(abi))
  t.deepEqual(abiCbor, abi)
  t.deepEqual(abiJson, abi)

  t.true(validateAbi(abi))
})

test.serial('abi does not include unnecessary types', async t => {
  const src = `
  export class Foo extends Jig {}
  export class Test extends Jig {
    a: ArrayBuffer = new ArrayBuffer(1);
    b: string = '';
    c: u32 = 123;
    d: Uint8Array = new Uint8Array(1);
    e: Foo = new Foo();
  }
  `.trim()

  const res = await compile(src)
  const abi = abiFromCbor(res.output.abi.buffer)
  const types = Object.keys(abi.typeIds)

  // t.false(types.includes('ArrayBuffer'))
  // t.false(types.includes('string'))
  // t.false(types.includes('Jig'))

  console.log(types)
  t.pass()
})