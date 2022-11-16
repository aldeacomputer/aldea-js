import test from 'ava'
import { compile } from '../dist/compiler.js'
import { abiFromCbor } from '../dist/abi.js'
import { sha256 } from '@noble/hashes/sha256'

test('compiles single source', async t => {
  await t.notThrowsAsync(() => compile('export class Test extends Jig {}'))
  await t.notThrowsAsync(() => compile('export function test(): void {}'))
})

/** These tests must be run in serial as the way the abi is generated
 * can't be done in parallel */

test.serial('compiles multiple sources', async t => {
  const sources = {
    'foo.ts': 'export declare class Foo { name: string }',
    'input.ts': `
      import { Foo } from './foo'
      export function test(foo: Foo): string { return foo.name }
    `.trim()
  }

  const res = await compile(sources)
  const abi = abiFromCbor(res.output.abi.buffer)

  t.is(abi.objects.length, 1)
  t.is(abi.objects[0].name, 'Foo')
  t.is(abi.functions.length, 1)
  t.is(abi.functions[0].name, 'test')
})

test.serial('compiles multiple entries', async t => {
  const sources = {
    'foo.ts': 'export declare class Foo { name: string }',
    'input1.ts': `
      import { Foo } from './foo'
      export function test1(foo: Foo): string { return foo.name }
    `.trim(),
    'input2.ts': `
      import { Foo } from './foo'
      export function test2(foo: Foo): string { return foo.name }
    `.trim()
  }

  const res = await compile(sources)
  const abi = abiFromCbor(res.output.abi.buffer)

  t.is(abi.objects.length, 1)
  t.is(abi.objects[0].name, 'Foo')
  t.is(abi.functions.length, 2)
  t.is(abi.functions[0].name, 'test1')
  t.is(abi.functions[1].name, 'test2')
})
