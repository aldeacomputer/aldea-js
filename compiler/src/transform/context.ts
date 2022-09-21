import {
  ClassDeclaration,
  Node,
  NodeKind,
  Parser,
  Source,
  SourceKind,
  Statement,
} from 'assemblyscript'

import { ClassNode } from './nodes.js'


/**
 * Transform context
 */
export class TransformCtx {
  parser: Parser;
  src: Source;
  classNodes: ClassNode[];

  constructor(parser: Parser) {
    this.parser = parser
    this.src = findUserSource(this.parser.sources)
    this.classNodes = collectClassNodes(this.src.statements, this)
  }

  get abstractClasses(): ClassNode[] {
    return this.classNodes.filter(n => n.isAbstract)
  }

  get complexClasses(): ClassNode[] {
    return this.classNodes.filter(n => n.isComplex)
  }

  get jigClasses(): ClassNode[] {
    return this.classNodes.filter(n => n.isJig)
  }

  get externalClasses(): ClassNode[] {
    return this.classNodes.filter(n => n.isExternal)
  }

  parse(code: string): Source {
    const parser = new Parser(this.parser.diagnostics)
    parser.parseFile(code, this.src.normalizedPath, true)
    return parser.sources[0]
  }
}

/**
 * Helpers
 */

// Find and return the user entry source
function findUserSource(sources: Source[]): Source {
  const userSrc = sources.filter(s => {
    return s.sourceKind === SourceKind.USER_ENTRY && /^(?!~lib).+/.test(s.internalPath)
  })

  if (!userSrc.length) { throw new Error('user entry not found') }
  if (userSrc.length > 1) { throw new Error('more than 1 user entry') }
  return userSrc[0]
}

// Collect all classes declared in the statement nodes
function collectClassNodes(nodes: Statement[], ctx: TransformCtx): ClassNode[] {
  return nodes
    .filter(n => n.kind === NodeKind.CLASSDECLARATION)
    .map((n): ClassNode => new ClassNode(n as ClassDeclaration, ctx))
}
