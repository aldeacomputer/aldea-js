import {expect} from 'chai'
import {AbiTraveler} from "../vm/abi-helpers/abi-traveler.js";
import {
  ExportNode,
  Abi,
  ClassNode,
  FieldKind,
  FieldNode,
  MethodNode,
  TypeNode,
  CodeKind,
  ImportNode,
  ObjectNode
} from "@aldea/compiler/abi";

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

class TestTraveller extends AbiTraveler<string> {
  classParts: string[]
  objectParts: string[]

  constructor (abi: Abi) {
    super(abi)
    this.classParts = []
    this.objectParts = []
  }

  visitSmallNumberValue(typeName: string): string {
    return typeName
  }

  visitIBigNumberValue(): string {
    return 'i64'
  }

  visitUBigNumberValue(): string {
    return 'u64'
  }

  visitBoolean(): string {
    return 'bool'
  }

  visitString(): string {
    return 'string'
  }

  visitImportedClass(node: TypeNode, packageId: string): string {
    return `${packageId}_${node.name}`
  }

  visitArray(innerType: TypeNode): string {
    return `Array<${innerType.name}>`
  }

  visitMap(keyType: TypeNode, valueType: TypeNode): string {
    return `Map<${keyType.name}, ${valueType.name}>`
  }

  visitSet(innerType: TypeNode): string {
    return `Set<${innerType.name}>`
  }

  visitTypedArray(typeName: string): string {
    return typeName
  }

  visitStaticArray(innerType: TypeNode): string {
    return `StaticArray<${innerType.name}>`
  }

  visitArrayBuffer(): string {
    return 'ArrayBuffer'
  }

  visitVoid(): string {
    return 'void'
  }

  visitValue(type: TypeNode): string {
    const childVisitor = new TestTraveller(this.abi)
    return childVisitor.travelFromType(type)
  }

  visitExportedClass(classNode: ClassNode, type: TypeNode): string {
    const parts = classNode.fields.map(field => {
      const value = this.visitValue(field.type)
      return `${field.name}: ${value}`
    })

    return `${classNode.name}<${parts.join(', ')}>`
  }

  visitPlainObject(objNode: ObjectNode, type: TypeNode): string {
    this.objectParts = [objNode.name]

    const parts = objNode.fields.map((field: FieldNode) => {
      const fieldType = this.visitValue(field.type)
      return `${field.name}: ${fieldType}`
    })

    return `Object(${objNode.name})<${parts.join(', ')}>`
  }
}

const tn = (name: string, args: string[] = []): TypeNode => ({ name, args: args.map(arg => tn(arg))}) //tn => TypeNode
describe('AbiTraveler', () => {

  describe('when the class has a single basic type field', () => {
    function checkScenario (typeName: string) {
      const abi = new TestAbiBuilder()
        .addExportedClass('Foo', cls => {
          cls.withField(FieldKind.PUBLIC, 'bar', { name: typeName, args: [] })
        })
        .build()

      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('Foo'))
      expect(ret).to.eql(`Foo<bar: ${typeName}>`)
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
      const traveler = new TestTraveller(abi)
      const typeName = traveler.travelFromType(tn('u8'))
      expect(typeName).to.eql('u8')
    })

    it('travels correctly u16', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('u16'))
      expect(ret).to.eql('u16')
    })

    it('travels correctly u32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('u32'))
      expect(ret).to.eql('u32')
    })

    it('travels correctly i16', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('i16'))
      expect(ret).to.eql('i16')
    })

    it('travels correctly i32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('i32'))
      expect(ret).to.eql('i32')
    })

    it('travels correctly usize', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('usize'))
      expect(ret).to.eql('usize')
    })

    it('travels correctly isize', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('isize'))
      expect(ret).to.eql('isize')
    })

    it('travels correctly f32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('f32'))
      expect(ret).to.eql('f32')
    })

    it('travels correctly f64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('f64'))
      expect(ret).to.eql('f64')
    })

    it('travels correctly u64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('u64'))
      expect(ret).to.eql('u64')
    })

    it('travels correctly i64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('i64'))
      expect(ret).to.eql('i64')
    })

    it('travels correctly bool values', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('bool'))
      expect(ret).to.eql('bool')
    })

    it('travels correctly string values', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      const ret = traveler.travelFromType(tn('string'))
      expect(ret).to.eql('string')
    })
    //
    it('travels correctly array values with basic types', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      expect(
        traveler.travelFromType(tn('Array', ['u8']))
      ).to.eql('Array<u8>')

      expect(
        traveler.travelFromType(tn('Array', ['string']))
      ).to.eql('Array<string>')
    })

    it('travels correctly sets values with basic types', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      expect (
        traveler.travelFromType(tn('Set', ['u8']))
      ).to.eql('Set<u8>')
      expect (
        traveler.travelFromType(tn('Set', ['string']))
      ).to.eql('Set<string>')
    })

    it('travels correctly map values with basic types', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      expect(
        traveler.travelFromType(tn('Map', ['u8', 'string']))
      ).to.eql('Map<u8, string>')
      expect(
        traveler.travelFromType(tn('Map', ['string', 'f64']))
      ).to.eql('Map<string, f64>')
    })

    it('works for array buffers', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)

      const type = 'ArrayBuffer'
      expect(
        traveler.travelFromType(tn(type))
      ).to.eql(type)
    })

    it('typed arrays', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)

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
        expect(
          traveler.travelFromType(tn(type))
        ).to.eql(type)
      })
    })

    it('works for static arrays', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new TestTraveller(abi)
      expect(
        traveler.travelFromType(tn('StaticArray', ['u8']))
      ).to.eql('StaticArray<u8>')
    })
  })

  it('correctly visits imported elements', () => {
    const abi = new TestAbiBuilder()
      .addImportedClass('Foo', 'someorigin')
      .build()

    const traveler = new TestTraveller(abi)
    expect(
      traveler.travelFromType(tn('Foo'))
    ).to.eql('someorigin_Foo')
  })

  it('can be used to travel plain objets', () => {
    const abi = new TestAbiBuilder()
      .addExportedPlainObject('Foo', (cls: TestAbiClassBuilder) => {
        cls.withField(FieldKind.PUBLIC, 'a', tn('u8'))
        cls.withField(FieldKind.PUBLIC, 'b', tn('string'))
        cls.withField(FieldKind.PUBLIC, 'c', tn('Array',['f64']))
      })
      .build()

    const traveler = new TestTraveller(abi)
    expect(
      traveler.travelFromType(tn('Foo'))
    ).to.eql(`Object(Foo)<a: u8, b: string, c: Array<f64>>`)
  })
})
