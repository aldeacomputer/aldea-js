import {
  ClassDeclaration,
  FieldDeclaration,
  MethodDeclaration,
  NodeKind,
  Parser,
  Source,
} from 'assemblyscript'

import { JigField } from './jig-field.js'
import { JigMethod } from './jig-method.js'
import {
  writeJigMethod,
  writeParseMethod,
  writeSerializeMethod
} from './code-writer.js'

/**
 * Jig class. 
 */
export class JigClass {
  #node: ClassDeclaration;
  name: string;
  iName: string;
  fields: JigField[];
  methods: JigMethod[];

  constructor(node: ClassDeclaration) {
    this.#node = node
    this.name = node.name.text
    this.iName = `$${ node.name.text.toLowerCase() }`
    
    this.fields = node.members
      .filter(m => m.kind === NodeKind.FIELDDECLARATION)
      .map(m => JigField.fromNode(m as FieldDeclaration))

    this.methods = node.members
      .filter(m => m.kind === NodeKind.METHODDECLARATION)
      .map(m => JigMethod.fromNode(m as MethodDeclaration))
  }

  get source(): Source {
    return this.#node.range.source
  }

  transform({ diagnostics }: Parser): void {
    const parser = new Parser(diagnostics)
    const codes = this.methods.reduce((acc: string[], m: JigMethod): string[] => {
      acc.push(writeJigMethod(m, this))
      return acc
    }, [])
    codes.push(writeParseMethod(this))
    codes.push(writeSerializeMethod(this))
    parser.parseFile(codes.join('\n'), this.source.normalizedPath, true)
    this.source.statements.push(...parser.sources[0].statements)
  }
}
