import test from 'ava'
import { compile } from '../dist/compiler.js'

// template for adding root level statements
function stmtCode(code) {
  return `
  ${code}
  export class Test extends Jig {}
  `.trim()
}

// template for adding class members
function classMbrCode(code) {
  return `
  export class Test extends Jig {
    ${code}
  }
  `.trim()
}

// template for adding imported class member
function importedClassMbrCode(code) {
  return `
  export class A extends Jig {}
  @imported('0000000000000000000000000000000000000000000000000000000000000000')
  declare class Test extends Jig {
    ${code}
  }
  `.trim()
}

// template for adding class members with plain object
function classMbrWithDepCode(code) {
  return `
  export declare class A { foo: u8; }
  export class Test extends Jig {
    ${code}
  }
  `.trim()
}

// template for adding class members with sidekick object
function classMbrWithSidekickCode(code) {
  return `
  class A { foo: u8 = 1; }
  export class Test extends Jig {
    ${code}
  }
  `.trim()
}

// template for adding arbitrary code to function
function methodStmtCode(code) {
  return `
  export class Test extends Jig {
    init(): void {
      ${code}
    }
  }
  `.trim()
}

test('throws if source has 0 exports', async t => {
  const e = await t.throwsAsync(() => compile('class Test extends Jig {}'))
  t.regex(e.stderr.toString(), /must have at least one named export/)
})

test('compiles if source has >= 1 exports', async t => {
  await t.notThrowsAsync(() => compile('export class Test extends Jig {}'))
  await t.notThrowsAsync(() => compile('export function test(): void {}'))
})

test('throws if source root has var declaration', async t => {
  const e = await t.throwsAsync(() => compile(stmtCode('var a = 1')))
  t.regex(e.stderr.toString(), /Illegal statement/)
  t.regex(e.stderr.toString(), /var a = 1/)
})

test('throws if surce root has const declaration of non literal', async t => {
  const e = await t.throwsAsync(() => compile(stmtCode('const a = [1]')))
  t.regex(e.stderr.toString(), /Illegal statement/)
  t.regex(e.stderr.toString(), /const a = \[1\]/)
})

test('compiles if source root has const delcalration of literal', async t => {
  await t.notThrowsAsync(() => compile(stmtCode('const a = 1')))
  await t.notThrowsAsync(() => compile(stmtCode('const a = "a"')))
  await t.notThrowsAsync(() => compile(stmtCode('const a = true')))
  await t.notThrowsAsync(() => compile(stmtCode('const a = false')))
  await t.notThrowsAsync(() => compile(stmtCode('const a = null')))
})

test('throws if source root has namespace declaration', async t => {
  const e = await t.throwsAsync(() => compile(stmtCode('namespace A {}')))
  t.regex(e.stderr.toString(), /Illegal statement/)
  t.regex(e.stderr.toString(), /namespace A {}/)
})

test('throws if source root has type alias declaration', async t => {
  const e = await t.throwsAsync(() => compile(stmtCode('type A = string')))
  t.regex(e.stderr.toString(), /Illegal statement/)
  t.regex(e.stderr.toString(), /type A = string/)
})

test('compiles if source root has enum delcalration', async t => {
  await t.notThrowsAsync(() => compile(stmtCode('enum A { FOO }')))
})

test('throws if class has static props', async t => {
  const e = await t.throwsAsync(() => compile(classMbrCode('static a: u8 = 1')))
  t.regex(e.stderr.toString(), /Invalid member/)
  t.regex(e.stderr.toString(), /static a: u8 = 1/)
})

test('throws if class has instance method beginning with underscore', async t => {
  const e = await t.throwsAsync(() => compile(classMbrCode('_a(): void {}')))
  t.regex(e.stderr.toString(), /Invalid member/)
  t.regex(e.stderr.toString(), /_a\(\): void {}/)
})

test('throws if class has readonly method', async t => {
  const e = await t.throwsAsync(() => compile(classMbrCode(`readonly a(): u8 { return 1 }`)))
  t.regex(e.stderr.toString(), /Invalid member/)
  t.regex(e.stderr.toString(), /readonly a\(\)/)
})

test('throws if class has getter method', async t => {
  const e = await t.throwsAsync(() => compile(classMbrCode(`get a(): u8 { return 1 }`)))
  t.regex(e.stderr.toString(), /Invalid member/)
  t.regex(e.stderr.toString(), /get a\(\)/)
})

test('throws if class has setter method', async t => {
  const e = await t.throwsAsync(() => compile(classMbrCode(`a: u8; set aa(val: u8) { this.a = val }`)))
  t.regex(e.stderr.toString(), /Invalid member/)
  t.regex(e.stderr.toString(), /set aa\(val: u8\)/)
})

test('compiles if class is valid', async t => {
  const code = classMbrCode(`
  foo: u32 = 0;
  getFoo(): u32 { return this.foo }
  `)
  await t.notThrowsAsync(() => compile(code))
})

test('throws if class field is unsupported type', async t => {
  const e = await t.throwsAsync(() => compile(classMbrWithSidekickCode('a: A = new A();')))
  t.regex(e.stderr.toString(), /Invalid type/)
  t.regex(e.stderr.toString(), /a: A = new A\(\);/)
})

test('compiles if class field is falid type', async t => {
  await t.notThrowsAsync(() => compile(classMbrCode('a: u8 = 0;')).catch(e => { console.log(e.stderr.toString()); throw e }))
  await t.notThrowsAsync(() => compile(classMbrCode('a: string = "";')))
  await t.notThrowsAsync(() => compile(classMbrCode('a: u8[] = [0];')))
  await t.notThrowsAsync(() => compile(classMbrCode('a: Uint8Array = new Uint8Array(1);')))
})

test('compiles if class field is plain object', async t => {
  await t.notThrowsAsync(() => compile(classMbrWithDepCode('a: A = { foo: 1 }')))
})

test('throws if class method arg is unsupported type', async t => {
  const e = await t.throwsAsync(() => compile(classMbrWithSidekickCode('foo(a: A): void {}')))
  t.regex(e.stderr.toString(), /Invalid type/)
  t.regex(e.stderr.toString(), /foo\(a: A\): void {}/)
})

test('throws if class method return is unsupported type', async t => {
  const e = await t.throwsAsync(() => compile(classMbrWithSidekickCode('foo(): A { return new A() }')))
  t.regex(e.stderr.toString(), /Invalid type/)
  t.regex(e.stderr.toString(), /foo\(\): A/)
})

test('compiles if class method args and return types are supported', async t => {
  await t.notThrowsAsync(() => compile(classMbrCode('foo(a: string): string { return a }')))
})

test('compiles if class method args type is plain object', async t => {
  await t.notThrowsAsync(() => compile(classMbrWithDepCode('foo(a: A): u8 { return a.foo }')))
})

test('compiles if class method return type is plain object', async t => {
  await t.notThrowsAsync(() => compile(classMbrWithDepCode('foo(a: u8): A { return { foo: a } }')))
})

test('throws if a plain object uses inheritance', async t => {
  const code = `
  declare class A {}
  declare class B extends A {}
  `.trim()
  const e = await t.throwsAsync(() => compile(stmtCode(code)))
  t.regex(e.stderr.toString(), /Invalid class/)
  t.regex(e.stderr.toString(), /declare class B extends A \{\}/)
})

test('throws if any double undersore identifiers are seen anywhere', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('const __bad = 1')))
  t.regex(e.stderr.toString(), /Illegal identifier/)
  t.regex(e.stderr.toString(), /const __bad = 1/)
})

test('throws if blacklisted function is called', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('load(1000)')))
  t.regex(e.stderr.toString(), /Illegal access/)
  t.regex(e.stderr.toString(), /load\(1000\)/)
})

test('throws if blacklisted constructor is called', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('new Date(1)')))
  t.regex(e.stderr.toString(), /Illegal access/)
  t.regex(e.stderr.toString(), /new Date\(1\)/)
})

test('throws if accesses a blacklisted namespace', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('heap.alloc(100)')))
  t.regex(e.stderr.toString(), /Illegal access/)
  t.regex(e.stderr.toString(), /heap.alloc\(100\)/)
})

test('throws if accesses a blacklisted property on restricted namespace', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('Math.random()')))
  t.regex(e.stderr.toString(), /Illegal access/)
  t.regex(e.stderr.toString(), /Math.random\(\)/)
})

test('compiles if accesses a safe property on restricted namespace', async t => {
  await t.notThrowsAsync(() => compile(methodStmtCode('Math.min(1, 2)')))
})

test('throws if reassigns a blacklisted function', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('const x = load')))
  t.regex(e.stderr.toString(), /Illegal assignment/)
  t.regex(e.stderr.toString(), /const x = load/)
})

test('throws if reassigns a blacklisted constructor', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('const x = Date')))
  t.regex(e.stderr.toString(), /Illegal assignment/)
  t.regex(e.stderr.toString(), /const x = Date/)
})

test('throws if reassigns a blacklisted namespace', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('const x = heap')))
  t.regex(e.stderr.toString(), /Illegal assignment/)
  t.regex(e.stderr.toString(), /const x = heap/)
})

test('throws if reassigns a restricted namespace', async t => {
  const e = await t.throwsAsync(() => compile(methodStmtCode('const x = Math')))
  t.regex(e.stderr.toString(), /Illegal assignment/)
  t.regex(e.stderr.toString(), /const x = Math/)
})

test('throws if assemblyscript decorator is used', async t => {
  const e = await t.throwsAsync(() => compile(stmtCode('@inline function foo(): u8 { return 1 }')))
  t.regex(e.stderr.toString(), /Invalid decorator/)
  t.regex(e.stderr.toString(), /@inline function foo\(\): u8/)
})

test('throws if invalid origin pointer is given', async t => {
  const e = await t.throwsAsync(() => compile(stmtCode('@imported("not a pointer") declare function foo(): u8;')))
  t.regex(e.stderr.toString(), /Invalid package/)
  t.regex(e.stderr.toString(), /@imported\("not a pointer"\)/)
})

test('compiles if with valid imported class', async t => {
  compile(importedClassMbrCode('a: string;')).catch(e => {
    console.log(e.stderr.toString())
  })
  await t.notThrowsAsync(() => compile(importedClassMbrCode('a: string;')))
})

test('throws if imported class declares private property', async t => {
  const e = await t.throwsAsync(() => compile(importedClassMbrCode('private a: string;')))
  t.regex(e.stderr.toString(), /Private and protected members/)
  t.regex(e.stderr.toString(), /private a: string;/)
})

test('throws if imported class declares protected property', async t => {
  const e = await t.throwsAsync(() => compile(importedClassMbrCode('protected a: string;')))
  t.regex(e.stderr.toString(), /Private and protected members/)
  t.regex(e.stderr.toString(), /protected a: string;/)
})

test('throws if imported class declares private method', async t => {
  const e = await t.throwsAsync(() => compile(importedClassMbrCode('private a(): string;')))
  t.regex(e.stderr.toString(), /Private and protected members/)
  t.regex(e.stderr.toString(), /private a\(\): string;/)
})

test('throws if imported class declares protected method', async t => {
  const e = await t.throwsAsync(() => compile(importedClassMbrCode('protected a(): string;')))
  t.regex(e.stderr.toString(), /Private and protected members/)
  t.regex(e.stderr.toString(), /protected a\(\): string;/)
})

test('throws if Jig descendent is not exported', async t => {
  const src = `
  export class A extends Jig {}
  export class B extends A {}
  class C extends B {}
  `.trim()
  const e = await t.throwsAsync(() => compile(src))
  t.regex(e.stderr.toString(), /Invalid class/)
  t.regex(e.stderr.toString(), /class C extends B {}/)
})

test('throws if non Jig descendent is exported', async t => {
  const src = `
  class A {}
  class B extends A {}
  export class C extends B {}
  `.trim()
  const e = await t.throwsAsync(() => compile(src))
  t.regex(e.stderr.toString(), /Invalid class/)
  t.regex(e.stderr.toString(), /export class C extends B {}/)
})

test('throws if exposed object is not exported', async t => {
  const src = `
  declare class A { name: string }
  export class Test extends Jig {
    a: A;
    constructor(name: string) {
      super()
      this.a = { name }
    }
  }
  `.trim()
  const e = await t.throwsAsync(() => compile(src))
  // TODO - should be better error about exporting plain objects
  t.regex(e.stderr.toString(), /Invalid type/)
})

test('should not be able to name a class Jig', async t => {
  const src = `
  export class Jig extends Jig {}
  `

  const e = await t.throwsAsync(() => compile(src))
  t.regex(e.stderr.toString(), /Invalid class/)
})

test('export class cannot have circular dependency', async t => {
  const src = `
  export class A extends B {}
  export class B extends A {}
  `

  const e = await t.throwsAsync(() => compile(src))
  t.regex(e.stderr.toString(), /Invalid class/)
})

test('sidekick classes cannot make circular dependency', async t => {
  const src = `
  export function test(): void {
    const a = new A()
  }

  class A extends B {}
  class B extends A {}
  `

  const e = await t.throwsAsync(() => compile(src))
  t.regex(e.stderr.toString(), /TS2506/)
})

test.skip('implementing a different method signature should fail', async t => {
  const src = `
  export interface A {
    m(): void;
  }

  export class B extends Jig implements A {
    m(n: u8): void {}
  }
  `

  const e = await t.throwsAsync(() => compile(src))
  console.log(e.stderr.toString())
})