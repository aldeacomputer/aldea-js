import test from 'ava'
import { ASTBuilder, NodeKind } from 'assemblyscript'
import { mockProgram } from './support/mock-program.js'
import { afterParse } from '../dist/transform.js'
import { isAmbient, isPrivate, isProtected } from '../dist/transform/filters.js'

test('afterParse() adds hook to constructors', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: u8;
    constructor() {
      super();
      this.a = 123;
    }
  }`)

  // Initially two statements in contructor
  t.is(mock.classes[0].members[1].body.statements.length, 2)

  afterParse(mock.parser)
  t.is(mock.classes[0].members[1].body.statements.length, 3)
  t.is(
    ASTBuilder.build(mock.classes[0].members[1].body.statements[2]),
    'vm_constructor_end(this, "Test")'
  )
})

test('afterParse() adds constructor if not defined', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
  }`)

  // Initially one memeber in class
  t.is(mock.classes[0].members.length, 0)

  afterParse(mock.parser)
  t.is(mock.classes[0].members.length, 1)
  t.is(
    ASTBuilder.build(mock.classes[0].members[0]),
    'constructor() {\n'+
    '  super();\n'+
    '  vm_constructor_end(this, "Test");\n'+
    '}'
  )
})

test('afterParse() add proxy methods for public methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: u8;

    constructor() {
      super();
      this.a = 123;
    }

    changeA(b: u8): void { this.a = b }    
  }`)

  // Initially three memebers in class
  t.is(mock.classes[0].members.length, 3)

  afterParse(mock.parser)
  t.is(mock.classes[0].members.length, 4)
  // adds prefix to origin method name
  t.is(mock.classes[0].members[2].name.text, '_changeA')
  t.is(
    ASTBuilder.build(mock.classes[0].members[3]),
    'changeA(a0: u8): void {\n'+
    '  vm_local_call_start(this, "Test$changeA");\n'+
    '  this._changeA(a0);\n'+
    '  vm_local_call_end();\n'+
    '}'
  )
})

test('afterParse() add proxy methods for private methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    a: u8;

    constructor() {
      super();
      this.a = 123;
    }

    protected add(b: u8): i32 { this.a + b }
    private mul(b: u8): i32 { this.a * b }
  }`)

  // Initially four memebers in class
  t.is(mock.classes[0].members.length, 4)

  afterParse(mock.parser)
  t.is(mock.classes[0].members.length, 6)
  // adds prefix to origin method name
  t.is(mock.classes[0].members[2].name.text, '_add')
  t.is(mock.classes[0].members[3].name.text, '_mul')

  t.is(mock.classes[0].members[4].kind, NodeKind.MethodDeclaration)
  t.is(mock.classes[0].members[4].name.text, 'add')
  t.true(isProtected(mock.classes[0].members[4].flags))
  t.is(mock.classes[0].members[5].kind, NodeKind.MethodDeclaration)
  t.is(mock.classes[0].members[5].name.text, 'mul')
  t.true(isPrivate(mock.classes[0].members[5].flags))
})

test('afterParse() does not add proxy methods for static methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    constructor() {
      super();
    }

    static helloWorld(str: string): string { return 'hello '+str }
  }`)

  t.is(mock.classes[0].members.length, 2)
  afterParse(mock.parser)
  t.is(mock.classes[0].members.length, 2)
})

test('afterParse() adds exported constructors methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
  }`)

  t.is(mock.functions.length, 0)
  afterParse(mock.parser)
  t.is(mock.functions.length, 1)
  t.is(
    ASTBuilder.build(mock.functions[0]),
    'export function Test_constructor(): Test {\n'+
    '  return new Test();\n'+
    '}'
  )
})

test('afterParse() adds exported static methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    static helloWorld(str: string): string { return 'hello '+str }
  }`)

  t.is(mock.functions.length, 0)
  afterParse(mock.parser)
  t.is(mock.functions.length, 2)
  t.is(
    ASTBuilder.build(mock.functions[1]),
    'export function Test_helloWorld(a0: string): string {\n'+
    '  return Test.helloWorld(a0);\n'+
    '}'
  )
})

test('afterParse() adds exported public instance methods', async t => {
  const mock = await mockProgram(`
  export class Test extends Jig {
    helloWorld(str: string): string { return 'hello '+str }
  }`)

  t.is(mock.functions.length, 0)
  afterParse(mock.parser)
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
  afterParse(mock.parser)
  t.is(mock.functions.length, 1)
})

test('afterParse() replaces imported ambient class with concrete implementation', async t => {
  const mock = await mockProgram(`
  export function test(t: Test): void {}

  @imported('0000000000000000000000000000000000000000000000000000000000000000')
  declare class Test {}
  `)

  t.is(mock.source.statements.length, 2)
  t.true(isAmbient(mock.classes[0].flags))
  
  afterParse(mock.parser)
  // after parse ambiant class is replaced with concrete implementation
  t.is(mock.source.statements.length, 2)
  t.false(isAmbient(mock.classes[0].flags))
  t.is(
    ASTBuilder.build(mock.classes[0]),
    'class Test extends RemoteJig {}'
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
  
  afterParse(mock.parser)
  t.is(
    ASTBuilder.build(mock.classes[0].members[0]),
    'get a(): u32 {\n'+
    '  return vm_remote_prop<u32>(this.$output.origin, "a");\n'+
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
  
  afterParse(mock.parser)
  t.is(
    ASTBuilder.build(mock.classes[0].members[0]),
    'a(a0: u8): u8 {\n'+
    '  const args = new ArgWriter(1);\n'+
    '  args.writeU8(a0);\n'+
    '  return vm_remote_call_i<u8>(this.$output.origin, "a", args.buffer);\n'+
    '}'
  )
  t.is(
    ASTBuilder.build(mock.classes[0].members[1]),
    'static b(a0: u8): u8 {\n'+
    '  const args = new ArgWriter(1);\n'+
    '  args.writeU8(a0);\n'+
    '  return vm_remote_call_s<u8>("0000000000000000000000000000000000000000000000000000000000000000", "Test_b", args.buffer);\n'+
    '}'
  )
})

test('afterParse() by default add no complex setters', async t => {
  const mock = await mockProgram(`
  export function test(t: u8): void {}
  `)

  afterParse(mock.parser)
  t.is(mock.functions.length, 1)
})

test('afterParse() adds Map setter if required', async t => {
  const mock = await mockProgram(`
  export function test(m: Map<string, string>): void {}
  `)

  afterParse(mock.parser)
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

  afterParse(mock.parser)
  t.is(mock.functions.length, 2)
  t.regex(
    ASTBuilder.build(mock.functions[1]),
    /export function __put_set_entry_[a-f0-9]{8}\(set: Set<string>, val: string\)/
  )
})
