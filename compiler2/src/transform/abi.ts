import {
  ClassDeclaration,
  CommonFlags,
  DeclarationStatement,
  DecoratorKind,
  DecoratorNode,
  FieldDeclaration,
  IdentifierExpression,
  LiteralExpression,
  LiteralKind,
  MethodDeclaration,
  NamedTypeNode,
  NodeKind,
  ParameterNode,
  Parser,
  StringLiteralExpression,
  Source,
  SourceKind
} from 'assemblyscript'

export interface BaseAbiNode<N> {
  node: N;
  name: string;
  decorators?: DecoratorAbiNode[];
}

export interface ObjectAbiNode extends BaseAbiNode<ClassDeclaration> {
  extends?: string;
  fields: FieldAbiNode[];
  methods: MethodAbiNode[];
}

export interface FieldAbiNode extends BaseAbiNode<FieldDeclaration | ParameterNode> {
  type: TypeAbiNode;
}

export interface MethodAbiNode extends BaseAbiNode<MethodDeclaration> {
  args: FieldAbiNode[];
  rtype: TypeAbiNode;
}

export interface DecoratorAbiNode extends BaseAbiNode<DecoratorNode> {
  args: string[];
}

export interface TypeAbiNode extends BaseAbiNode<NamedTypeNode> {
  args: TypeAbiNode[];
}

export class AbiCtx {
  parser: Parser;
  sources: Source[];
  objects: ObjectAbiNode[];

  constructor(parser: Parser) {
    this.parser = parser
    this.sources = collectUserSources(parser.sources)
    this.objects = collectObjectAbiNodes(this.sources)

    this.validate()
  }

  validate() {
    return true
  }
}

function collectUserSources(sources: Source[]): Source[] {
  return sources
    .filter(s => s.sourceKind <= SourceKind.USER_ENTRY && /^(?!~lib).+/.test(s.internalPath))
}

function collectObjectAbiNodes(sources: Source[]): ObjectAbiNode[] {
  return sources
    .flatMap(s => s.statements.filter(n => n.kind === NodeKind.CLASSDECLARATION) as ClassDeclaration[])
    .map(n => {
      return {
        node: n,
        name: n.name.text,
        extends: n.extendsType?.name.identifier.text,
        decorators: collectDecoratorAbiNodes(n.decorators || []),
        fields: [],
        methods: []
      }
    })
}

function collectDecoratorAbiNodes(decorators: DecoratorNode[]): DecoratorAbiNode[] {
  return decorators
    .filter(n => n.decoratorKind === DecoratorKind.CUSTOM)
    .map(n => {
      const args = (n.args || [])
        .filter(a => a.kind === NodeKind.LITERAL)
        .filter(a => (a as LiteralExpression).literalKind === LiteralKind.STRING)
        .map((a): string => (a as StringLiteralExpression).value)

      return {
        node: n,
        name: (n.name as IdentifierExpression).text,
        args: args
      }
    })
}