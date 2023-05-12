import test from 'ava'
import { abiFromBin } from '@aldea/core'
import { compile } from '../dist/compiler.js'

test('compiles single source', async t => {
  await t.notThrowsAsync(() => compile('export class Test extends Jig {}'))
  await t.notThrowsAsync(() => compile('export function test(): void {}'))
})

/** These tests must be run in serial as the way the abi is generated
 * can't be done in parallel */

test('compiles multiple sources', async t => {
  const sources = {
    'foo.ts': 'export declare class Foo { name: string }',
    'input.ts': `
      import { Foo } from './foo'
      export function test(foo: Foo): string { return foo.name }
    `.trim()
  }

  const res = await compile('input.ts', sources)
  const abi = abiFromBin(res.output.abi)

  t.is(abi.objects.length, 1)
  t.is(abi.objects[0].name, 'Foo')
  t.is(abi.exports.length, 1)
  t.is(abi.exports[0].code.name, 'test')
})

test('compiles multiple entries', async t => {
  const sources = {
    'bar.ts': 'const bar = 25;',
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

  const res = await compile(['input2.ts', 'input1.ts'], sources)
  const abi = abiFromBin(res.output.abi)

  t.is(abi.objects.length, 1)
  t.is(abi.objects[0].name, 'Foo')
  t.is(abi.exports.length, 2)
  t.is(abi.exports[0].code.name, 'test1')
  t.is(abi.exports[1].code.name, 'test2')
})

test('child classes do not include fields of parents', async t => {
  const src = `
  export class A extends Jig {
    a: string = 'a';
  }
  export class B extends A {
    b: string = 'b';
  }
  export class C extends B {
    a: string = 'c';
  }
  `.trim()
  
  const res = await compile(src)
  const abi = abiFromBin(res.output.abi)

  t.is(abi.exports.length, 3)
  t.is(abi.exports[0].code.name, 'A')
  t.is(abi.exports[0].code.fields.length, 1)
  t.is(abi.exports[0].code.fields[0].name, 'a')
  t.is(abi.exports[1].code.name, 'B')
  t.is(abi.exports[1].code.fields.length, 1)
  t.is(abi.exports[1].code.fields[0].name, 'b')
  t.is(abi.exports[2].code.name, 'C')
  t.is(abi.exports[2].code.fields.length, 0)
})

test('child classes do not include methods of parents unless overwritten', async t => {
  const src = `
  export class A extends Jig {
    foo(): void {}
  }
  export class B extends A {
    bar(): void {}
  }
  export class C extends B {
    foo(): void {}
  }
  `.trim()
  
  const res = await compile(src)
  const abi = abiFromBin(res.output.abi)

  t.is(abi.exports.length, 3)
  t.is(abi.exports[0].code.name, 'A')
  // constructor is always first method
  t.is(abi.exports[0].code.methods.length, 2)
  t.is(abi.exports[0].code.methods[1].name, 'foo')
  t.is(abi.exports[1].code.name, 'B')
  t.is(abi.exports[1].code.methods.length, 2)
  t.is(abi.exports[1].code.methods[1].name, 'bar')
  t.is(abi.exports[2].code.name, 'C')
  t.is(abi.exports[2].code.methods.length, 2)
  t.is(abi.exports[2].code.methods[1].name, 'foo')
})