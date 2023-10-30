import test from 'ava'
import { abiFromBin } from '@aldea/core'
import { compile } from '../dist/compiler.js'

test('compiles single source', async t => {
  await t.notThrowsAsync(() => compile('export class Test extends Jig {}'))
  await t.notThrowsAsync(() => compile('export function test(): void {}'))
})

test('compiles multiple sources', async t => {
  const sources = new Map([
    ['foo.ts', 'export declare class Foo { name: string }'],
    ['input.ts', `
      import { Foo } from './foo'
      export { Foo }
      export function test(foo: Foo): string { return foo.name }
    `.trim()]
  ])

  const res = await compile(['input.ts'], sources) //.catch(err => console.log(err.stderr.toString()))
  const abi = abiFromBin(res.output.abi)

  t.is(abi.exports.length, 2)
  t.is(abi.exports.map(i => abi.defs[i] )[0].name, 'test')
  t.is(abi.exports.map(i => abi.defs[i] )[1].name, 'Foo')
})

test('compiles multiple entries', async t => {
  const sources = new Map([
    ['bar.ts', 'const bar = 25;'],
    ['foo.ts', 'export declare class Foo { name: string }'],
    ['input1.ts', `
      import { Foo } from './foo'
      export { Foo }
      export function test1(foo: Foo): string { return foo.name }
    `.trim()],
    ['input2.ts', `
      import { Foo } from './foo'
      export function test2(foo: Foo): string { return foo.name }
    `.trim()]
  ])

  const res = await compile(['input2.ts', 'input1.ts'], sources)
  const abi = abiFromBin(res.output.abi)

  t.is(abi.exports.length, 3)
  t.is(abi.exports.map(i => abi.defs[i] )[0].name, 'test1')
  t.is(abi.exports.map(i => abi.defs[i] )[1].name, 'test2')
  t.is(abi.exports.map(i => abi.defs[i] )[2].name, 'Foo')
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
  t.is(abi.exports.map(i => abi.defs[i] )[0].name, 'A')
  t.is(abi.exports.map(i => abi.defs[i] )[0].fields.length, 1)
  t.is(abi.exports.map(i => abi.defs[i] )[0].fields[0].name, 'a')
  t.is(abi.exports.map(i => abi.defs[i] )[1].name, 'B')
  t.is(abi.exports.map(i => abi.defs[i] )[1].fields.length, 1)
  t.is(abi.exports.map(i => abi.defs[i] )[1].fields[0].name, 'b')
  t.is(abi.exports.map(i => abi.defs[i] )[2].name, 'C')
  t.is(abi.exports.map(i => abi.defs[i] )[2].fields.length, 0)
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
  t.is(abi.exports.map(i => abi.defs[i] )[0].name, 'A')
  // constructor is always first method
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods.length, 2)
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods[1].name, 'foo')
  t.is(abi.exports.map(i => abi.defs[i] )[1].name, 'B')
  t.is(abi.exports.map(i => abi.defs[i] )[1].methods.length, 2)
  t.is(abi.exports.map(i => abi.defs[i] )[1].methods[1].name, 'bar')
  t.is(abi.exports.map(i => abi.defs[i] )[2].name, 'C')
  t.is(abi.exports.map(i => abi.defs[i] )[2].methods.length, 2)
  t.is(abi.exports.map(i => abi.defs[i] )[2].methods[1].name, 'foo')
})