import {
  ClassDeclaration,
  CommonFlags,
  IdentifierExpression,
  Node,
  NodeKind,
  Parser,
  Source,
  SourceKind,
} from 'assemblyscript'

/**
 * The context module is WIP - currently serves no function
 */

class TransformCtx {
  parser: Parser;
  src: Source;
  classNodes: ClassDeclaration[];

  constructor(parser: Parser) {
    this.parser = parser
    this.src = findUserSource(this.parser.sources)
    this.classNodes = findClasses(this.src)
  }

  get abstractClasses(): ClassDeclaration[] {
    return this.classNodes.filter(n => isAmbient(n) && !isExternal(n))
  }

  get complexClasses(): ClassDeclaration[] {
    return this.classNodes.filter(n => !isAmbient(n))
  }
}

/**
 * TODO
 */
function findUserSource(sources: Source[]): Source {
  const userSrc = sources.filter((s: Source): boolean => {
    return s.sourceKind === SourceKind.USER_ENTRY && /^(?!~lib).+/.test(s.internalPath)
  })

  if (!userSrc.length) { throw new Error('user entry not found') }
  if (userSrc.length > 1) { throw new Error('more than 1 user entry') }
  return userSrc[0]
}

/**
 * TODO
 */
function findClasses(s: Source): ClassDeclaration[] {
  const nodes = s.statements.filter((n: Node): boolean => {
    return n.kind === NodeKind.CLASSDECLARATION
  })
  return nodes as ClassDeclaration[]
}

/**
 * TODO
 */
function isAmbient(n: ClassDeclaration): boolean {
  return (n.flags & CommonFlags.AMBIENT) === CommonFlags.AMBIENT
}

/**
 * TODO
 */
function isExternal(n: ClassDeclaration): boolean {
  const decorators = n.decorators?.filter(d => (d.name as IdentifierExpression).text === 'jig')
  return isAmbient(n) && !!decorators?.length
}
