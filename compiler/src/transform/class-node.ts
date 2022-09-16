import {
  ClassDeclaration,
  CommonFlags,
  DecoratorNode,
  DecoratorKind,
  FieldDeclaration,
  MethodDeclaration,
  NodeKind,
  Parser,
  Source,
} from 'assemblyscript'

import { ClassDecorator } from './class-decorator.js'
import { ClassField } from './class-field.js'
import { ClassMethod } from './class-method.js'

export class ClassNode {
  node: ClassDeclaration;
  name: string;
  iName: string;
  decorators: ClassDecorator[];
  fields: ClassField[];
  methods: ClassMethod[];

  constructor(node: ClassDeclaration) {
    this.node = node
    this.name = node.name.text
    this.iName = `$${ node.name.text.toLowerCase() }`

    this.decorators = (node.decorators || [])
      .filter(n => n.decoratorKind === DecoratorKind.CUSTOM)
      .map(n => ClassDecorator.fromNode(n as DecoratorNode))
    
    this.fields = node.members
      .filter(m => m.kind === NodeKind.FIELDDECLARATION)
      .map(m => ClassField.fromNode(m as FieldDeclaration))

    this.methods = node.members
      .filter(m => m.kind === NodeKind.METHODDECLARATION)
      .map(m => ClassMethod.fromNode(m as MethodDeclaration))
      .filter(m => !m.isPrivate && !m.isProtected)

    this.validate()
  }

  get source(): Source {
    return this.node.range.source
  }

  get isAmbiant(): boolean {
    return (this.node.flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
  }

  get isAbstract(): boolean {
    return this.isAmbiant && !this.isExternal
  }

  get isExternal(): boolean {
    return this.isAmbiant && this.decorators.some(d => d.name === 'jig')
  }

  get isComplex(): boolean {
    return !this.isAmbiant
  }

  get isExported(): boolean {
    return (this.node.flags & CommonFlags.EXPORT) === CommonFlags.EXPORT
  }

  get isJig(): boolean {
    return this.isComplex && this.isExported
  }

  get isSidekick(): boolean {
    return this.isComplex && !this.isExported
  }

  transform(_parser: Parser): void {}

  //transform({ diagnostics }: Parser): void {
  //  const parser = new Parser(diagnostics)
  //  const codes = this.methods.reduce((acc: string[], m: ClassMethod): string[] => {
  //    acc.push(writeJigMethod(m, this))
  //    return acc
  //  }, [])
  //  codes.push(writeParseMethod(this))
  //  codes.push(writeSerializeMethod(this))
  //  parser.parseFile(codes.join('\n'), this.source.normalizedPath, true)
  //  this.source.statements.push(...parser.sources[0].statements)
  //}

  validate(): boolean { return true }
}