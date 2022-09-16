import {
  ASTBuilder,
  ClassDeclaration,
  CommonFlags,
  DiagnosticMessage,
  Node,
  NodeKind,
  Parser,
  Source,
  SourceKind,
} from 'assemblyscript'

import { ClassNode } from './transform/class-node.js'
import { ClassMethod } from './transform/class-method.js'

import {
  writeClassWrapper,
  writeDeserializeStaticMethod,
  writeSerializeInstanceMethod,
  writeExportMethod,
  writeExportDeserializeMethod,
  writeExportSerializeMethod,
} from './transform/code-writer.js'


/**
 * Called when parsing is complete, and the AST is ready.
 */
export function afterParse(parser: Parser): void {
  const nodes = selectClassNodes(parser.sources)

  console.log('ORIGINAL')
  console.log(ASTBuilder.build(nodes[0].source))

  transform(nodes.filter(n => n.isComplex), parser.diagnostics, transformComplexObj)
  transform(nodes.filter(n => n.isComplex), parser.diagnostics, transformJigObj)
  transform(nodes.filter(n => n.isComplex), parser.diagnostics, transformExternalObj)

  console.log('TRANSFORMED')
  console.log(ASTBuilder.build(nodes[0].source))
}


/**
 * Selects class nodes from the given sources.
 */
function selectClassNodes(sources: Source[]): ClassNode[] {
  const classNodes = sources
    .filter((s: Source): boolean => {
      return s.sourceKind === SourceKind.USER_ENTRY && /^(?!~lib).+/.test(s.internalPath)
    })
    .flatMap((s: Source): Node[] => {
      return s.statements.filter((n: Node): boolean => n.kind === NodeKind.CLASSDECLARATION)
    })

  return classNodes.map(n => new ClassNode(n as ClassDeclaration))
}


/**
 * Executes the callback transform method on each of the nodes, passing in a
 * new Parser instance each time.
 */
function transform(nodes: ClassNode[], diagnostics: DiagnosticMessage[], callback: Function): void {
  nodes.forEach(obj => callback(obj, new Parser(diagnostics)))
}


/**
 * Transforms complex objects.
 * 
 * - Adds #deserialize() method to the class
 * - Adds .serialize() method to the class
 */
function transformComplexObj(obj: ClassNode, parser: Parser): void {
  console.log(obj.name, 'Adding #deserialize() and .serialize()')
  const code = writeClassWrapper(obj, [
    writeDeserializeStaticMethod(obj),
    writeSerializeInstanceMethod(obj)
  ])
  parser.parseFile(code, obj.source.normalizedPath, true)
  const members = (parser.sources[0].statements[0] as ClassDeclaration).members
  obj.node.members.push(...members)
}

/**
 * Transforms jig objects.
 * 
 * - Exports method for each public static or instance method
 * - Exports deserialize() method
 * - Exports serialize() method
 */
function transformJigObj(obj: ClassNode, parser: Parser): void {
  console.log(obj.name, 'Exporting all methods')
  const codes = obj.methods.reduce((acc: string[], m: ClassMethod): string[] => {
    acc.push(writeExportMethod(m, obj))
    return acc
  }, [])

  console.log(obj.name, 'Assing schema, deserialize, and serialize')
  codes.push(writeExportDeserializeMethod(obj))
  codes.push(writeExportSerializeMethod(obj))

  // Remove the class export
  obj.node.flags = obj.node.flags & ~CommonFlags.EXPORT

  parser.parseFile(codes.join('\n'), obj.source.normalizedPath, true)
  obj.source.statements.push(...parser.sources[0].statements)
}

function transformExternalObj(obj: ClassNode): void {
  console.log(obj.name, 'Creating external obj')
  // Not yet implemented
}
