import {
  DecoratorNode,
  IdentifierExpression,
  LiteralExpression,
  LiteralKind,
  NodeKind,
  StringLiteralExpression
} from 'assemblyscript'

export interface DecoratorArg {
  type: string;
  value: any;
}

export class ClassDecorator {
  name: string;
  args: string[];

  constructor(name: string, args: string[]) {
    this.name = name
    this.args = args
  }

  static fromNode(node: DecoratorNode): ClassDecorator {
    const args = node.args || []
    const args1 = args.filter(a => a.kind === NodeKind.LITERAL) as LiteralExpression[]
    const args2 = args1.filter(a => a.literalKind === LiteralKind.STRING) as StringLiteralExpression[]

    return new this(
      (node.name as IdentifierExpression).text,
      args2.map(a => a.value)
    )
  }
}