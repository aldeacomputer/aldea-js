import test from 'ava'
import { compileDocs } from '@aldea/compiler'

const codeWithDocs = `
/**
 * Package docs
 * @package
 * @foo bar baz
 */

/**
 * Class A
 */
export class A extends Jig {
  /** a */
  a: u8 = 1
  /** b */
  private b: u8 = 1

  /** constructor */
  constructor() { super() }

  /** static */
  static s(): void {}

  /** method */
  m(): void {}

  /** private */
  p(): void {}
}

/**
 * Interface B
 */
export interface B {
  /** a */
  a: u8
  /** method */
  m(): void {}
}

/**
 * Function c
 */
export function c(): D {
  return { a: 1, b: 'foo' }
}

/**
 * Object D
 */
export declare class D {
  /** a */
  a: u8;
  /** b */
  b: string;
}
`.trim()

const codeNoDocs = `
export class A extends Jig {
  a: u8 = 1
  private b: u8 = 1

  constructor() { super() }
  static s(): void {}
  m(): void {}
  p(): void {}
}

export interface B {
  a: u8
  m(): void {}
}

export function c(): D {
  return { a: 1, b: 'foo' }
}

export declare class D {
  a: u8;
  b: string;
}
`.trim()

test('compilerDocs returns docs with everything captured', async t => {
  const { pkg, docs } = await compileDocs(codeWithDocs)

  t.is(pkg.description, 'Package docs')
  t.is(pkg.tags.length, 2)
  t.is(pkg.tags[0].tag, 'package')
  t.is(pkg.tags[1].tag, 'foo')
  t.is(pkg.tags[1].name, 'bar')
  t.is(pkg.tags[1].description, 'baz')

  t.is(docs['A'], 'Class A')
  t.is(docs['A.a'], 'a')
  t.is(docs['A.b'], 'b')
  t.is(docs['A_constructor'], 'constructor')
  t.is(docs['A_s'], undefined)
  t.is(docs['A_m'], 'method')
  t.is(docs['A$p'], undefined)

  t.is(docs['B'], 'Interface B')
  t.is(docs['B.a'], 'a')
  t.is(docs['B_m'], 'method')

  t.is(docs['c'], 'Function c')

  t.is(docs['D'], 'Object D')
  t.is(docs['D.a'], 'a')
  t.is(docs['D.b'], 'b')
})

test('compilerDocs returns empty obj when code is not documented', async t => {
  const docs = await compileDocs(codeNoDocs)
  t.deepEqual(docs, {})
})