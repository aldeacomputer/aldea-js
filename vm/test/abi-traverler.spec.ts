import {AbiTraveler} from "../vm/abi-helpers/abi-traveler.js"
import {expect} from 'chai'
import {AbiVisitor} from "../vm/abi-helpers/abi-visitor.js";
// import {Abi, ClassNode, FieldKind, FieldNode, MethodNode, TypeNode} from "@aldea/compiler/dist/abi/types";
import {CodeKind, Abi, ClassNode, FieldKind, FieldNode, MethodNode, TypeNode} from "@aldea/compiler/abi";

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
  classes: ClassNode[]
  constructor() {
    this.classes = []
  }

  build (): Abi {
    const exports = this.classes.map(clsNode => ({ kind: CodeKind.CLASS, code: clsNode }) )
    return {
      exports,
      imports: [],
      objects: [],
      typeIds: {},
      version: 1
    }
  }

  addClass (clsName: string, fn: (b: TestAbiClassBuilder) => void): TestAbiBuilder {
    const builder = new TestAbiClassBuilder()
    builder.withName(clsName)
    fn(builder)
    this.classes.push(builder.build())
    return this
  }
}

class TestVisitor implements AbiVisitor {
  allFields: FieldNode[];
  numberFields: FieldNode[];
  bigNumberFields: FieldNode[];
  basicValues: string[];
  classNames: string[];

  constructor () {
    this.allFields = []
    this.numberFields = []
    this.bigNumberFields = []
    this.basicValues = []
    this.classNames = []
  }

  visitSmallNumberField(fieldNode: FieldNode): void {
    this.allFields.push(fieldNode)
    this.numberFields.push(fieldNode)
  }

  visitSmallNumberValue(typeName: string): void {
    this.basicValues.push(typeName)
  }

  visitBigNumberValue(typeName: string): void {
    this.basicValues.push(typeName)
  }

  visitBoolean(): void {
    this.basicValues.push('bool')
  }

  visitString(): void {
    this.basicValues.push('string')
  }

  visitExportedClass(node: ClassNode, traveler: AbiTraveler): void {
    this.classNames.push(node.name)
    node.fields.forEach(fieldNode => traveler.visitValue(fieldNode.type.name, this))
  }
}

describe('AbiTraveler', () => {
  let testVisitor: TestVisitor

  beforeEach(() => {
    testVisitor = new TestVisitor()
  })

  describe('when the class has a single basic type field', () => {
    function checkScenario (typeName: string) {
      const abi = new TestAbiBuilder()
        .addClass('Foo', cls => {
          cls.withField(FieldKind.PUBLIC, 'bar', { name: typeName, args: [] })
        })
        .build()

      const traveler = new AbiTraveler(abi)
      traveler.visitValue('Foo', testVisitor)
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

  describe.skip('when the class has a single big integer field', function () {
    function checkScenario (typeName: string) {
      const abi = new TestAbiBuilder()
        .addClass('Foo', cls => {
          cls.withField(FieldKind.PUBLIC, 'bar', { name: typeName, args: [] })
        })
        .build()

      const traveler = new AbiTraveler(abi)
      traveler.visitValue('Foo', testVisitor)
      expect(testVisitor.allFields).to.have.length(1)
      expect(testVisitor.bigNumberFields).to.have.length(1)
      expect(testVisitor.bigNumberFields[0]).to.have.eql(
        { type: { name: typeName, args: [] }, name: 'bar', kind: FieldKind.PUBLIC }
      )
    }


  });

  describe('it travels correctly basic types', () => {
    it('travels correctly u8', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('u8', testVisitor)
      expect(testVisitor.basicValues).to.eql(['u8'])
    })

    it('travels correctly u16', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('u16', testVisitor)
      expect(testVisitor.basicValues).to.eql(['u16'])
    })

    it('travels correctly u32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('u32', testVisitor)
      expect(testVisitor.basicValues).to.eql(['u32'])
    })

    it('travels correctly i8', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('i8', testVisitor)
      expect(testVisitor.basicValues).to.eql(['i8'])
    })

    it('travels correctly i16', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('i16', testVisitor)
      expect(testVisitor.basicValues).to.eql(['i16'])
    })

    it('travels correctly i32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('i32', testVisitor)
      expect(testVisitor.basicValues).to.eql(['i32'])
    })

    it('travels correctly usize', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('usize', testVisitor)
      expect(testVisitor.basicValues).to.eql(['usize'])
    })

    it('travels correctly isize', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('isize', testVisitor)
      expect(testVisitor.basicValues).to.eql(['isize'])
    })

    it('travels correctly f32', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('f32', testVisitor)
      expect(testVisitor.basicValues).to.eql(['f32'])
    })

    it('travels correctly f64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('f64', testVisitor)
      expect(testVisitor.basicValues).to.eql(['f64'])
    })

    it('travels correctly u64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('u64', testVisitor)
      expect(testVisitor.basicValues).to.eql(['u64'])
    })

    it('travels correctly i64', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('i64', testVisitor)
      expect(testVisitor.basicValues).to.eql(['i64'])
    })

    it('travels correctly bool values', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('bool', testVisitor)
      expect(testVisitor.basicValues).to.eql(['bool'])
    })

    it('travels correctly string values', () => {
      const abi = new TestAbiBuilder().build()
      const traveler = new AbiTraveler(abi)
      traveler.visitValue('string', testVisitor)
      expect(testVisitor.basicValues).to.eql(['string'])
    })
  })
})
