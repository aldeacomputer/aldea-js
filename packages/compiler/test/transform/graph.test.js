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

  t.is(ctx.imports.length, 0)
  t.is(ctx.exports.length, 2)
})

test('ctx collects all imported classes and functions', async t => {
  const mock = await mockProgram(`
  @imported('00000000_1') declare class A extends Jig { a: u8; }
  @imported('00000000_2') declare function b(): void;
  export function test(): A { return new A() };
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.imports.length, 2)
  t.is(ctx.exports.length, 1)
})

test('ctx collects plain objects exposed in exported api', async t => {
  const mock = await mockProgram(`
  export function test(a: A, b: B): void {}
  export declare class A { a: u8; }
  export declare class B { a: u8; }
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.exports.length, 3)
})

test('ctx ignores plain objects not exported', async t => {
  const mock = await mockProgram(`
  export function test(): void {}
  declare class A { a: u8; }
  declare class B { a: u8; }
  }`)
  const ctx = new TransformGraph(mock.parser)
  t.is(ctx.exports.length, 1)
})

test('ctx collects all exposed types', async t => {
  const mock = await mockProgram(`
  export function test(a: A, b: B, c: string): void {}
  export declare class A { a: u8; }
  export declare class B { a: u8; }
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
  export class D { d: u64; }
  class NotExported {}
  `)
  const ctx = new TransformGraph(mock.parser)
  t.context.transform.afterParse(mock.parser)
  await mock.compile()
  ctx.program = mock.pgm

  const abi = ctx.toABI()
  t.is(abi.exports.length, 4)
  t.true(abi.exports.some(i => abi.defs[i].name === 'B'))
  t.true(abi.exports.some(i => abi.defs[i].name === 'b'))
  t.true(abi.exports.some(i => abi.defs[i].name === 'C'))
  t.true(abi.exports.some(i => abi.defs[i].name === 'D'))
  t.is(abi.imports.length, 2)
  t.true(abi.imports.some(i => abi.defs[i].name === 'A'))
  t.true(abi.imports.some(i => abi.defs[i].name === 'a'))
  t.is(abi.typeIds.length, 11)
  abi.typeIds.forEach(({ name }) => {
    t.true(['A', 'B', '*B', 'C', '*C', 'D', 'string', 'Jig', 'JigInitParams', 'Output', 'Lock'].includes(name))
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
  t.is(abi.exports.map(i => abi.defs[i] )[0].fields.length, 3)
  abi.exports.map(i => abi.defs[i] )[0].fields.forEach(f => {
    t.true(['a', 'b', 'c'].includes(f.name))
  })
})

test('ctx.toABI() exported classes has constructor even if not defined', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: u32 = 100;
  }
  }`)

  const ctx = new TransformGraph(mock.parser)
  t.context.transform.afterParse(mock.parser)
  await mock.compile()
  ctx.program = mock.pgm

  const abi = ctx.toABI()
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods.length, 1)
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods[0].name, 'constructor')
})

test('ctx.toABI() exported classes contain only public and protected methods', async t => {
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
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods.length, 3)
  abi.exports.map(i => abi.defs[i] )[0].methods.forEach(f => {
    t.true(['constructor', 'a', 'c'].includes(f.name))
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
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods[0].name, 'constructor')
  t.is(abi.exports.map(i => abi.defs[i] )[0].methods[0].rtype, null)
})
