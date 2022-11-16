import test from 'ava'
import { compile } from '../dist/compiler.js'
import { abiFromCbor } from '../dist/abi.js'

test('compiles single source', async t => {
  await t.notThrowsAsync(() => compile('export class Test extends Jig {}'))
  await t.notThrowsAsync(() => compile('export function test(): void {}'))
})

test('compiles multiple sources', async t => {
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
