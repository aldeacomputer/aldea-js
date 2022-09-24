import {
  ASTBuilder,
  ClassDeclaration,
  CommonFlags,
  Parser,
  Statement,
} from 'assemblyscript'

/**
 * Called when parsing is complete, and the AST is ready.
 */
export function afterParse(parser: Parser): void {
  console.log('AFTER PARSE!!')
}
