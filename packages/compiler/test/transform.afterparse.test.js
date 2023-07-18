import test from 'ava'
import { ASTBuilder, NodeKind } from 'assemblyscript'
import { mockProgram } from './support/mock-program.js'
import { Transform } from '../dist/transform.js'
import { isAmbient, isPrivate, isProtected } from '../dist/transform/filters.js'

test.beforeEach(t => {
  t.context.transform = new Transform()
})

test('afterParse() adds constructor if not defined', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
  }`)

  // Initially one memeber in class
  t.is(mock.classes[0].members.length, 0)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.classes[0].members.length, 1)
  t.is(
    ASTBuilder.build(mock.classes[0].members[0]),
    'constructor() {\n'+
    '  super();\n'+
    '}'
  )
})

test('afterParse() creates interface for each jig class', async t => {
  const mock = await mockProgram(`export class Test extends Jig {}`)

  // Initially zero interfaces
  t.is(mock.interfaces.length, 0)

  t.context.transform.afterParse(mock.parser)
  t.is(
    ASTBuilder.build(mock.interfaces[0]),
    'interface Test extends Jig {\n}'
  )
})

test('afterParse() creates interface declaring all jig public fields and instance methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: string = 'a';
    private b: string = 'b';

    aa(): string { return this.a }
    private static bb(): string { return this.b }
    protected static cc(): string { return this.b }
    static ss(): string { return 's' }
  }`)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.interfaces[0].members.length, 2)
  t.is(
    ASTBuilder.build(mock.interfaces[0]),
    'interface Test extends Jig {\n'+
    '  a: string;\n'+
    '  aa(): string;\n'+
    '}'
  )
})

test('afterParse() creates local and remote class for each jig class', async t => {
  const mock = await mockProgram(`export class Test extends Jig {}`)

  // Initially single class
  t.is(mock.classes.length, 1)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.classes.length, 2)
  t.regex(
    ASTBuilder.build(mock.classes[0]),
    /^class _LocalTest extends _LocalJig implements Test {/
  )
  t.regex(
    ASTBuilder.build(mock.classes[1]),
    /^class _RemoteTest extends _RemoteJig implements Test {/
  )
})

test('afterParse() local jig mirrors real jig, remote jig has implements public field and instance methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: string = 'a';
    private b: string = 'b';

    aa(): string { return this.a }
    private static bb(): string { return this.b }
    protected static cc(): string { return this.b }
    static ss(): string { return 's' }
  }`)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.classes[0].members.length, 7)
  t.is(mock.classes[1].members.length, 3)
  t.regex(
    ASTBuilder.build(mock.classes[1].members[0]),
    /^get a\(\): string {/
  )
  t.regex(
    ASTBuilder.build(mock.classes[1].members[2]),
    /^aa\(\): string {/
  )
})

test('afterParse() adds exported constructors methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
  }`)

  t.is(mock.functions.length, 0)
  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 1)
  t.is(
    ASTBuilder.build(mock.functions[0]),
    'export function Test_constructor(): Test {\n'+
    '  return new _LocalTest();\n'+
    '}'
  )
})

test('afterParse() adds exported static methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    static helloWorld(str: string): string { return 'hello '+str }
  }`)

  t.is(mock.functions.length, 0)
  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 2)
  t.is(
    ASTBuilder.build(mock.functions[1]),
    'export function Test_helloWorld(a0: string): string {\n'+
    '  return _LocalTest.helloWorld(a0);\n'+
    '}'
  )
})

test('afterParse() adds exported public instance methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    helloWorld(str: string): string { return 'hello '+str }
  }`)

  t.is(mock.functions.length, 0)
  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 2)
  t.is(
    ASTBuilder.build(mock.functions[1]),
    'export function Test$helloWorld(ctx: Test, a0: string): string {\n'+
    '  return ctx.helloWorld(a0);\n'+
    '}'
  )
})

test('afterParse() does not add exported private instance methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    private helloWorld(str: string): string { return 'hello '+str }
  }`)

  t.is(mock.functions.length, 0)
  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 1)
})

test('afterParse() creates remote class for each interface', async t => {
  const mock = await mockProgram(`
  export interface Foo {
    a: string;
    b(): string;
  }
  `.trim())

  t.is(mock.classes.length, 0)
  t.context.transform.afterParse(mock.parser)
  t.is(mock.classes.length, 1)
  t.regex(
    ASTBuilder.build(mock.classes[0]),
    /^class _RemoteFoo extends _RemoteJig implements Foo {/
  )
  t.regex(
    ASTBuilder.build(mock.classes[0].members[0]),
    /^get a\(\): string {/
  )
  t.regex(
    ASTBuilder.build(mock.classes[0].members[1]),
    /^b\(\): string {/
  )
})


test('afterParse() replaces imported ambient class with concrete implementation', async t => {
  const mock = await mockProgram(`
  export function test(t: Test): void {}

  @imported('0000000000000000000000000000000000000000000000000000000000000000')
  declare class Test {}
  `)

  t.is(mock.source.statements.length, 2)
  t.true(isAmbient(mock.classes[0].flags))
  
  t.context.transform.afterParse(mock.parser)
  // after parse ambiant class is replaced with concrete implementation
  t.is(mock.source.statements.length, 2)
  t.false(isAmbient(mock.classes[0].flags))
  t.regex(
    ASTBuilder.build(mock.classes[0]),
    /^class Test extends _RemoteJig {.+}/s
  )
})

test('afterParse() adds getters to all imported class properties', async t => {
  const mock = await mockProgram(`
  export function test(t: Test): void {}

  @imported('0000000000000000000000000000000000000000000000000000000000000000')
  declare class Test {
    a: u32;
  }
  `)
  
  t.context.transform.afterParse(mock.parser)
  t.is(
    ASTBuilder.build(mock.classes[0].members[0]),
    'get a(): u32 {\n'+
    '  return vm_get_prop<u32>(this.$output.origin, "a");\n'+
    '}'
  )
})

test('afterParse() adds proxy methods to imported static and instance methods', async t => {
  const mock = await mockProgram(`
  export function test(t: Test): void {}

  @imported('0000000000000000000000000000000000000000000000000000000000000000')
  declare class Test {
    a(b: u8): u8;
    static b(a: u8): u8;
  }
  `)
  
  t.context.transform.afterParse(mock.parser)
  t.is(
    ASTBuilder.build(mock.classes[0].members[1]),
    'a(a0: u8): u8 {\n'+
    '  const args = new ArgWriter(1);\n'+
    '  args.writeU8(a0);\n'+
    '  return vm_call_method<u8>(this.$output.origin, "a", args.buffer);\n'+
    '}'
  )
  t.is(
    ASTBuilder.build(mock.classes[0].members[2]),
    'static b(a0: u8): u8 {\n'+
    '  const args = new ArgWriter(1);\n'+
    '  args.writeU8(a0);\n'+
    '  return vm_call_static<u8>("0000000000000000000000000000000000000000000000000000000000000000", "Test_b", args.buffer);\n'+
    '}'
  )
})

test('afterParse() by default add no complex setters', async t => {
  const mock = await mockProgram(`
  export function test(t: u8): void {}
  `)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 1)
})

test('afterParse() adds Map setter if required', async t => {
  const mock = await mockProgram(`
  export function test(m: Map<string, string>): void {}
  `)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 2)
  t.regex(
    ASTBuilder.build(mock.functions[1]),
    /export function __put_map_entry_[a-f0-9]{8}\(map: Map<string, string>, key: string, val: string\)/
  )
})

test('afterParse() adds Set setter if required', async t => {
  const mock = await mockProgram(`
  export function test(m: Set<string>): void {}
  `)

  t.context.transform.afterParse(mock.parser)
  t.is(mock.functions.length, 2)
  t.regex(
    ASTBuilder.build(mock.functions[1]),
    /export function __put_set_entry_[a-f0-9]{8}\(set: Set<string>, val: string\)/
  )
})
