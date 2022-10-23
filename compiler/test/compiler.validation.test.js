import test from 'ava'
import { compile } from '../dist/compiler.js'

// template for adding root level statements
function t1(code) {
  return `
  ${code}
  export class Test {}
  `.trim()
}

// template for adding class members
function t2(code) {
  return `
  export class Test {
    ${code}
  }
  `.trim()
}

// template for adding class members with plain object
function t3(code) {
  return `
  declare class A { foo: u8; }
  export class Test {
    ${code}
  }
  `.trim()
}

// template for adding arbitrary code to function
function t4(code) {
  return `
  export class Test {
    init(): void {
      ${code}
    }
  }
  `.trim()
}

test('throws if source has 0 exports', async t => {
  const e = await t.throwsAsync(() => compile('class Test {}'))
  t.regex(e.stderr.toString(), /must export at least one/)
})

test('compiles if source has >= 1 exports', async t => {
  await t.notThrowsAsync(() => compile('export class Test {}'))
  await t.notThrowsAsync(() => compile('export function test(): void {}'))
})

test('throws if source root has var declaration', async t => {
  const e = await t.throwsAsync(() => compile(t1('var a = 1')))
  t.regex(e.stderr.toString(), /AS400/)
  t.regex(e.stderr.toString(), /var a = 1/)
})

test('throws if surce root has const declaration of non literal', async t => {
  const e = await t.throwsAsync(() => compile(t1('const a = [1]')))
  t.regex(e.stderr.toString(), /AS400/)
  t.regex(e.stderr.toString(), /const a = \[1\]/)
})

test('compiles if source root has const delcalration of literal', async t => {
  await t.notThrowsAsync(() => compile(t1('const a = 1')))
  await t.notThrowsAsync(() => compile(t1('const a = "a"')))
  await t.notThrowsAsync(() => compile(t1('const a = true')))
  await t.notThrowsAsync(() => compile(t1('const a = false')))
  await t.notThrowsAsync(() => compile(t1('const a = null')))
})

test('throws if source root has type interface declaration', async t => {
  const e = await t.throwsAsync(() => compile(t1('interface A {}')))
  t.regex(e.stderr.toString(), /AS400/)
  t.regex(e.stderr.toString(), /interface A {}/)
})

test('throws if source root has namespace declaration', async t => {
  const e = await t.throwsAsync(() => compile(t1('namespace A {}')))
  t.regex(e.stderr.toString(), /AS400/)
  t.regex(e.stderr.toString(), /namespace A {}/)
})

test('throws if source root has type alias declaration', async t => {
  const e = await t.throwsAsync(() => compile(t1('type A = string')))
  t.regex(e.stderr.toString(), /AS400/)
  t.regex(e.stderr.toString(), /type A = string/)
})

test('compiles if source root has enum delcalration', async t => {
  await t.notThrowsAsync(() => compile(t1('enum A { FOO }')))
})

test('throws if class has static props', async t => {
  const e = await t.throwsAsync(() => compile(t2('static a: u8 = 1')))
  t.regex(e.stderr.toString(), /AS401/)
  t.regex(e.stderr.toString(), /static a: u8 = 1/)
})

test('throws if class has instance method beginning with underscore', async t => {
  const e = await t.throwsAsync(() => compile(t2('_a(): void {}')))
  t.regex(e.stderr.toString(), /AS402/)
  t.regex(e.stderr.toString(), /_a\(\): void {}/)
})

test('compiles if class is valid', async t => {
  const code = t2(`
  foo: u32 = 0;
  getFoo(): u32 { return this.foo }
  `)
  await t.notThrowsAsync(() => compile(code))
})

test('throws if class field is unsupported type', async t => {
  const e = await t.throwsAsync(() => compile(t2('a: Map<string, string> = new Map<string, string>();')))
  t.regex(e.stderr.toString(), /AS403/)
  t.regex(e.stderr.toString(), /a: Map<string, string> = new Map<string, string>\(\);/)
})

test('compiles if class field is falid type', async t => {
  await t.notThrowsAsync(() => compile(t2('a: u8 = 0;')))
  await t.notThrowsAsync(() => compile(t2('a: string = "";')))
  await t.notThrowsAsync(() => compile(t2('a: u8[] = [0];')))
  await t.notThrowsAsync(() => compile(t2('a: Uint8Array = new Uint8Array(1);')))
})

test('compiles if class field is plain object', async t => {
  await t.notThrowsAsync(() => compile(t3('a: A = { foo: 1 }')))
})

test('throws if class method arg is unsupported type', async t => {
  const e = await t.throwsAsync(() => compile(t2('foo(a: Map<string, string>): void {}')))
  t.regex(e.stderr.toString(), /AS404/)
  t.regex(e.stderr.toString(), /foo\(a: Map<string, string>\): void {}/)
})

test('throws if class method return is unsupported type', async t => {
  const e = await t.throwsAsync(() => compile(t2('foo(): Map<string, string> { return new Map<string, string>() }')))
  t.regex(e.stderr.toString(), /AS404/)
  t.regex(e.stderr.toString(), /foo\(\): Map<string, string>/)
})

test('compiles if class method args and return types are supported', async t => {
  await t.notThrowsAsync(() => compile(t2('foo(a: string): string { return a }')))
})

test('compiles if class method args type is plain object', async t => {
  await t.notThrowsAsync(() => compile(t3('foo(a: A): u8 { return a.foo }')))
})

test('compiles if class method return type is plain object', async t => {
  await t.notThrowsAsync(() => compile(t3('foo(a: u8): A { return { foo: a } }')))
})

test('throws if any double undersore identifiers are seen anywhere', async t => {
  const e = await t.throwsAsync(() => compile(t4('const __bad = 1')))
  t.regex(e.stderr.toString(), /AS405/)
  t.regex(e.stderr.toString(), /const __bad = 1/)
})

test('throws if blacklisted function is called', async t => {
  const e = await t.throwsAsync(() => compile(t4('load(1000)')))
  t.regex(e.stderr.toString(), /AS406/)
  t.regex(e.stderr.toString(), /load\(1000\)/)
})

test('throws if blacklisted constructor is called', async t => {
  const e = await t.throwsAsync(() => compile(t4('new Date(1)')))
  t.regex(e.stderr.toString(), /AS406/)
  t.regex(e.stderr.toString(), /new Date\(1\)/)
})

test('throws if accesses a blacklisted namespace', async t => {
  const e = await t.throwsAsync(() => compile(t4('heap.alloc(100)')))
  t.regex(e.stderr.toString(), /AS406/)
  t.regex(e.stderr.toString(), /heap.alloc\(100\)/)
})

test('throws if accesses a blacklisted property on restricted namespace', async t => {
  const e = await t.throwsAsync(() => compile(t4('Math.random()')))
  t.regex(e.stderr.toString(), /AS407/)
  t.regex(e.stderr.toString(), /Math.random\(\)/)
})

test('compiles if accesses a safe property on restricted namespace', async t => {
  await t.notThrowsAsync(() => compile(t4('Math.min(1, 2)')))
})

test('throws if reassigns a blacklisted function', async t => {
  const e = await t.throwsAsync(() => compile(t4('const x = load')))
  t.regex(e.stderr.toString(), /AS408/)
  t.regex(e.stderr.toString(), /const x = load/)
})

test('throws if reassigns a blacklisted constructor', async t => {
  const e = await t.throwsAsync(() => compile(t4('const x = Date')))
  t.regex(e.stderr.toString(), /AS408/)
  t.regex(e.stderr.toString(), /const x = Date/)
})

test('throws if reassigns a blacklisted namespace', async t => {
  const e = await t.throwsAsync(() => compile(t4('const x = heap')))
  t.regex(e.stderr.toString(), /AS408/)
  t.regex(e.stderr.toString(), /const x = heap/)
})

test('throws if reassigns a restricted namespace', async t => {
  const e = await t.throwsAsync(() => compile(t4('const x = Math')))
  t.regex(e.stderr.toString(), /AS408/)
  t.regex(e.stderr.toString(), /const x = Math/)
})
