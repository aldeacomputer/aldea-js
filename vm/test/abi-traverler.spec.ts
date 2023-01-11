import {AbiTraveler} from "../vm/abi-helpers/abi-traveler.js"
import {expect} from 'chai'
import {AbiVisitor} from "../vm/abi-helpers/abi-visitor.js";
// import {Abi, ClassNode, FieldKind, FieldNode, MethodNode, TypeNode} from "@aldea/compiler/dist/abi/types";
import {ExportNode, Abi, ClassNode, FieldKind, FieldNode, MethodNode, TypeNode, CodeKind, ImportNode, ObjectNode} from "@aldea/compiler/abi";

class TestAbiClassBuilder {
  fields: FieldNode[]
  methods: MethodNode[]
  name: string | null
  constructor() {
    this.fields = []
    this.methods = []
    this.name = null
  }

  withName (name: string): TestAbiClassBuilder {
    this.name = name
    return this
  }

  withField (kind: FieldKind, name: string, type: TypeNode) {
    this.fields.push({
      type,
      name,
      kind
    })
  }

  build(): ClassNode {
    if (!this.name) {
      throw new Error('name not set')
    }

    return {
      fields: this.fields,
      methods: [],
      name: this.name,
      extends: null
    };
  }
}

class TestAbiBuilder {
  private exports: ExportNode[]
  private imports: ImportNode[]
  private objects: ObjectNode[]
  constructor() {
    this.exports = []
    this.imports = []
    this.objects = []
  }

  build (): Abi {
    return {
      exports: this.exports,
      imports: this.imports,
      objects: this.objects,
      typeIds: {},
      version: 1
    }
  }

  addExportedClass (clsName: string, fn: (b: TestAbiClassBuilder) => void): TestAbiBuilder {
    const builder = new TestAbiClassBuilder()
    builder.withName(clsName)
    fn(builder)
    const clsNode = builder.build();
    this.exports.push({ kind: CodeKind.CLASS, code: clsNode })
    return this
  }

  addImportedClass(name: string, packageId: string): TestAbiBuilder {
    this.imports.push({
      kind: CodeKind.CLASS,
      name: name,
      origin: packageId
    })
    return this
  }

  addExportedPlainObject(name: string, fn: (cls: TestAbiClassBuilder) => void): TestAbiBuilder {
    const builder = new TestAbiClassBuilder()
    builder.withName(name)
    fn(builder)
    const clsNode = builder.build();
    this.objects.push({
      fields: clsNode.fields,
      name: clsNode.name,
      extends: clsNode.extends
    })
    return this
  }
}

class TestVisitor implements AbiVisitor {
  basicValues: string[];
  classNames: string[];
  imports: string[];
  typedArrayValues: string[];

  constructor () {
    this.basicValues = []
    this.classNames = []
    this.imports = []
    this.typedArrayValues = []
  }

  visitSmallNumberValue(typeName: string): void {
    this.basicValues.push(typeName)
  }

  visitIBigNumberValue(): void {
    this.basicValues.push('i64')
  }

  visitUBigNumberValue(): void {
    this.basicValues.push('u64')
  }

  visitBoolean(): void {
    this.basicValues.push('bool')
  }

  visitString(): void {
    this.basicValues.push('string')
  }

  visitExportedClass(node: ClassNode, traveler: AbiTraveler): void {
    this.classNames.push(node.name)
    node.fields.forEach(fieldNode => traveler.acceptForType(tn(fieldNode.type.name), this))
  }

  visitImportedClass(node: TypeNode, packageId: string): void {
    this.imports.push(`${packageId}_${node.name}`)
  }

  visitPlainObject(plainObjectNode: ObjectNode, typeNode: TypeNode, traveler: AbiTraveler): void {
    this.classNames.push(plainObjectNode.name)
    plainObjectNode.fields.forEach(fieldNode => traveler.acceptForType(fieldNode.type, this))
  }

  visitArray(innerType: TypeNode): void {
    this.basicValues.push(`Array<${innerType.name}>`)
  }

  visitMap(keyType: TypeNode, valueType: TypeNode): void {
    this.basicValues.push(`Map<${keyType.name}, ${valueType.name}>`)
  }

  visitSet(innerType: TypeNode): void {
    this.basicValues.push(`Set<${innerType.name}>`)
  }

  visitTypedArray(typeName: string, param2: AbiTraveler): void {
    this.basicValues.push(typeName)
    this.typedArrayValues.push(typeName)
  }

  visitStaticArray(innerType: TypeNode, traveler: AbiTraveler): void {
    this.basicValues.push(`StaticArray<${innerType.name}>`)
  }

  visitArrayBuffer(): void {
    this.basicValues.push('ArrayBuffer')
  }
}

const tn = (name: string, args: string[] = []): TypeNode => ({ name, args: args.map(arg => tn(arg))}) //tn => TypeNode
describe('AbiTraveler', () => {
  let testVisitor: TestVisitor

  beforeEach(() => {
    testVisitor = new TestVisitor()
  })

  describe('when the class has a single basic type field', () => {
    function checkScenario (typeName: string) {
      const abi = new TestAbiBuilder()
        .addExportedClass('Foo', cls => {
          cls.withField(FieldKind.PUBLIC, 'bar', { name: typeName, args: [] })
        })
        .build()

      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('Foo'), testVisitor)
      expect(testVisitor.classNames).to.eql(['Foo'])
      expect(testVisitor.basicValues).to.eql([typeName])
    }

    it('visits u8 as small number', () => {
      checkScenario('u8')
    })

    it('visits u16 as small number', () => {
      checkScenario('u16')
    })

    it('visits u32 as small number', () => {
      checkScenario('u32')
    })

    it('visits i8 as small number', () => {
      checkScenario('i8')
    })

    it('visits i16 as small number', () => {
      checkScenario('i16')
    })
    //
    it('visits i32 as small number', () => {
      checkScenario('i32')
    })

    it('visits f32 as small number', () => {
      checkScenario('f32')
    })

    it('visits f32 as small number', () => {
      checkScenario('f64')
    })

    it('visits u64 as bigNumbers number', () => {
      checkScenario('u64')
    })
  })

  describe('it travels correctly basic types', () => {
    it('travels correctly u8', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('u8'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['u8'])
    })

    it('travels correctly u16', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('u16'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['u16'])
    })

    it('travels correctly u32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('u32'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['u32'])
    })

    it('travels correctly i8', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('i8'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['i8'])
    })

    it('travels correctly i16', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('i16'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['i16'])
    })

    it('travels correctly i32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('i32'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['i32'])
    })

    it('travels correctly usize', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('usize'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['usize'])
    })

    it('travels correctly isize', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('isize'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['isize'])
    })

    it('travels correctly f32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('f32'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['f32'])
    })

    it('travels correctly f64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('f64'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['f64'])
    })

    it('travels correctly u64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('u64'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['u64'])
    })

    it('travels correctly i64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('i64'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['i64'])
    })

    it('travels correctly bool values', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('bool'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['bool'])
    })

    it('travels correctly string values', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('string'), testVisitor)
      expect(testVisitor.basicValues).to.eql(['string'])
    })

    it('travels correctly array values with basic types', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('Array', ['u8']), testVisitor)
      traveler.acceptForType(tn('Array', ['string']), testVisitor)
      expect(testVisitor.basicValues).to.eql(['Array<u8>', 'Array<string>'])
    })

    it('travels correctly sets values with basic types', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('Set', ['u8']), testVisitor)
      traveler.acceptForType(tn('Set', ['string']), testVisitor)
      expect(testVisitor.basicValues).to.eql(['Set<u8>', 'Set<string>'])
    })

    it('travels correctly map values with basic types', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('Map', ['u8', 'string']), testVisitor)
      traveler.acceptForType(tn('Map', ['string', 'f64']), testVisitor)
      expect(testVisitor.basicValues).to.eql(['Map<u8, string>', 'Map<string, f64>'])
    })

    it('works for array buffers', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)

      const type = 'ArrayBuffer'
      traveler.acceptForType(tn(type), testVisitor)

      expect(testVisitor.basicValues).to.eql([type])
    })

    it('typed arrays', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)

      const types = [
        'Int8Array',
        'Int16Array',
        'Int32Array',
        'Int64Array',
        'Uint8Array',
        'Uint16Array',
        'Uint32Array',
        'Uint64Array',
        'Float32Array',
        'Float64Array'
      ]

      types.forEach(type => {
        traveler.acceptForType(tn(type), testVisitor)
      })

      expect(testVisitor.basicValues).to.eql(types)
      expect(testVisitor.typedArrayValues).to.eql(types)
    })

    it('works for static arrays', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.acceptForType(tn('StaticArray', ['u8']), testVisitor)
      expect(testVisitor.basicValues).to.eql(['StaticArray<u8>'])
    })
  })

  it('correctly visits imported elements', () => {
    const abi = new TestAbiBuilder()
      .addImportedClass('Foo', 'someorigin')
      .build()

    const traveler = new AbiTraveler(abi)
    traveler.acceptForType(tn('Foo'), testVisitor)
    expect(testVisitor.imports).to.eql(['someorigin_Foo'])
  })

  it('can be used to travel plain objets', () => {
    const abi = new TestAbiBuilder()
      .addExportedPlainObject('Foo', (cls: TestAbiClassBuilder) => {
        cls.withField(FieldKind.PUBLIC, 'a', tn('u8'))
        cls.withField(FieldKind.PUBLIC, 'b', tn('string'))
        cls.withField(FieldKind.PUBLIC, 'c', tn('Array',['f64']))
      })
      .build()

    const traveler = new AbiTraveler(abi)
    traveler.acceptForType(tn('Foo'), testVisitor)
    expect(testVisitor.basicValues).to.eql(['u8', 'string', 'Array<f64>'])
  })
})
