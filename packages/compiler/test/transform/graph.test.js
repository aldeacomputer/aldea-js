import test from 'ava'
import { mockProgram } from '../support/mock-program.js'
import { TransformGraph } from '../../dist/transform/graph/index.js'
import { Transform } from '../../dist/transform.js'

test.beforeEach(t => {
  t.context.transform = new Transform()
})

test('ctx collects user sources and entries', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {}
  }`)
  const ctx = new TransformGraph(mock.parser)
  // bit of a rubbish test as the mock program
  // only allows giving one source. oh well
  t.is(ctx.sources.length, 1)
  t.is(ctx.entries.length, 1)
})

test('ctx collects exported classes and functions', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {}
  export function test(): void {}
  class NotExported {}
  }`)
  const ctx = new TransformGraph(mock.parser)

  t.is(ctx.exports.length, 2)
  t.is(ctx.objects.length, 0)
})

test('ctx collects all imported classes and functions', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {}
  @imported('00000000_1') declare class A extends Jig { a: u8; }
  @imported('00000000_2') declare function b(): void;
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.imports.length, 2)
})

test('ctx collects plain objects exposed in exported api', async t => {
  const mock = await mockProgram(`
  export function test(a: A, b: B): void {}
  declare class A { a: u8; }
  declare class B { a: u8; }
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.objects.length, 2)
})

test('ctx ignores plain objects not exposed in exported api', async t => {
  const mock = await mockProgram(`
  export function test(): void {}
  declare class A { a: u8; }
  declare class B { a: u8; }
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.objects.length, 0)
})

test('ctx collects all exposed types', async t => {
  const mock = await mockProgram(`
  export function test(a: A, b: B, c: string): void {}
  declare class A { a: u8; }
  declare class B { a: u8; }
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.exposedTypes.size, 5)
  ctx.exposedTypes.forEach((_val, key) => {
    t.true(['A', 'B', 'string', 'u8', 'void'].includes(key))
  })
})

test('ctx.toABI() has all the exports, imports and plain objects', async t => {
  const mock = await mockProgram(`
  @imported('0000000000000000000000000000000000000000000000000000000000000000') declare class A extends Jig { a: u8; }
  @imported('0000000000000000000000000000000000000000000000000000000000000000') declare function a(n: u8): A;
  export class B extends Jig { b: string = 'b'; }
  export function b(n: string, m: D): B { return new B() }
  export class C extends Jig {}
  declare class D { d: u64; }
  class NotExported {}
  `)
  const ctx = new TransformGraph(mock.parser)
  t.context.transform.afterParse(mock.parser)
  await mock.compile()
  ctx.program = mock.pgm

  const abi = ctx.toABI()
  t.is(abi.exports.length, 3)
  t.true(abi.exports.some(ex => ex.code.name === 'B'))
  t.true(abi.exports.some(ex => ex.code.name === 'b'))
  t.true(abi.exports.some(ex => ex.code.name === 'C'))
  t.is(abi.imports.length, 2)
  t.true(abi.imports.some(im => im.name === 'A'))
  t.true(abi.imports.some(im => im.name === 'a'))
  t.is(abi.objects.length, 1)
  t.true(abi.objects[0].name === 'D')
  t.is(abi.typeIds.length, 11)
  abi.typeIds.forEach(({ name }) => {
    t.true(['A', 'B', '$B', 'C', '$C', 'D', 'string', 'Jig', 'JigInitParams', 'Output', 'Lock'].includes(name))
  })
})

test('ctx.toABI() exported classes contain public and private fields', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: u8;
    private b: u8;
    protected c: u8;
  }
  }`)

  const ctx = new TransformGraph(mock.parser)
  t.context.transform.afterParse(mock.parser)
  await mock.compile()
  ctx.program = mock.pgm

  const abi = ctx.toABI()
  t.is(abi.exports[0].code.fields.length, 3)
  abi.exports[0].code.fields.forEach(f => {
    t.true(['a', 'b', 'c'].includes(f.name))
  })
})

test('ctx.toABI() exported classes contain only public methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a(): void {}
    private b(): void {}
    protected c(): void {}
  }
  }`)

  const ctx = new TransformGraph(mock.parser)
  t.context.transform.afterParse(mock.parser)
  await mock.compile()
  ctx.program = mock.pgm

  const abi = ctx.toABI()
  t.is(abi.exports[0].code.methods.length, 2)
  abi.exports[0].code.methods.forEach(f => {
    t.true(['constructor', 'a'].includes(f.name))
  })
})

test('ctx.toABI() class constructors have no return type', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: u8;
    constructor(a: u8) { this.a = a}
    x2(): void { this.a =* 2}
  }
  }`)

  const ctx = new TransformGraph(mock.parser)
  t.context.transform.afterParse(mock.parser)
  await mock.compile()
  ctx.program = mock.pgm

  const abi = ctx.toABI()
  t.is(abi.exports[0].code.methods[0].name, 'constructor')
  t.is(abi.exports[0].code.methods[0].rtype, null)
})