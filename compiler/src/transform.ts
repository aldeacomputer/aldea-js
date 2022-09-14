import {
  ASTBuilder,
  ClassDeclaration,
  Node,
  NodeKind,
  Parser,
  Source,
  SourceKind,
} from 'assemblyscript'

import { JigClass } from './transform/jig-class.js'


/**
 * Called when parsing is complete, and the AST is ready.
 */
export function afterParse(parser: Parser): void {
  const jigs = selectJigs(parser.sources)

  jigs.forEach(jig => {
    console.log(jig.name, 'ORIGINAL')
    console.log('--')
    console.log(ASTBuilder.build(jig.source))
    jig.transform(parser)
    console.log(jig.name, 'TRANSFORMED')
    console.log('--')
    console.log(ASTBuilder.build(jig.source))
  })
}


/**
 * Selects Jig classes from the given sources.
 */
function selectJigs(sources: Source[]): JigClass[] {
  const jigClassNodes = sources
    .filter((s: Source): boolean => {
      return s.sourceKind === SourceKind.USER_ENTRY && /^(?!~lib).+/.test(s.internalPath)
    })
    .flatMap((s: Source): Node[] => {
      return s.statements.filter((n: Node): boolean => n.kind === NodeKind.CLASSDECLARATION)
    })

  return jigClassNodes.map(n => new JigClass(n as ClassDeclaration))
}
