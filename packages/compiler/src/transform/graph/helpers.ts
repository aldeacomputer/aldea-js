import {
  ClassDeclaration,
  DeclarationStatement,
  DecoratorNode,
  EnumDeclaration,
  ExportDefaultStatement,
  ExportMember,
  ExportStatement,
  FunctionDeclaration,
  IdentifierExpression,
  ImportDeclaration,
  ImportStatement,
  InterfaceDeclaration,
  Node,
  NodeKind,
  Source,
  SourceKind,
  StringLiteralExpression,
} from 'assemblyscript'

import { isExported } from '../filters.js'

// --
// Source filters and helpers
// --

export function isDepSource(s: Source): boolean {
  return s.sourceKind == SourceKind.Library && /^~lib\/pkg:\/\/([a-f0-9]{2})+/.test(s.internalPath)
}

export function isUserSource(s: Source): boolean {
  return s.sourceKind <= SourceKind.UserEntry && /^(?!~lib).+/.test(s.internalPath);
}

export function isUserEntry(s: Source): boolean {
  return s.sourceKind === SourceKind.UserEntry
}

export function sortSources(a: Source, b: Source): number {
  return a.range.source.normalizedPath.localeCompare(b.range.source.normalizedPath)
}

// --
// Code declaration filters
// --

export function assertClassLike(n: Node): asserts n is ClassDeclaration | InterfaceDeclaration {
  if (!(isClass(n) ||isInterface(n))) {
    throw new Error(`invalid node. expected class or interface.`)
  }
}

export function isCodeDeclaration(n: Node): n is DeclarationStatement {
  return n.kind >= NodeKind.ClassDeclaration && n.kind <= NodeKind.VariableDeclaration
}

export function isClass(n: Node): n is ClassDeclaration {
  return n.kind === NodeKind.ClassDeclaration
}

export function isEnum(n: Node): n is EnumDeclaration {
  return n.kind === NodeKind.EnumDeclaration
}

export function isFunction(n: Node): n is FunctionDeclaration {
  return n.kind === NodeKind.FunctionDeclaration
}

export function isInterface(n: Node): n is InterfaceDeclaration {
  return n.kind === NodeKind.InterfaceDeclaration
}

// --
// Import/Export statement filters
// --

export function isExportMember(n: Node): n is ExportMember {
  return n.kind === NodeKind.ExportMember
}

export function isExportStatement(n: Node): n is ExportStatement {
  return n.kind === NodeKind.Export
}

export function isExportDefaultStatement(n: Node): n is ExportDefaultStatement {
  return n.kind === NodeKind.ExportDefault
}

export function isImportStatement(n: Node): n is ImportStatement {
  return n.kind === NodeKind.Import
}

export function isImportDeclaration(n: Node): n is ImportDeclaration {
  return n.kind === NodeKind.ImportDeclaration
}

export function isNamedExport(n: Node): n is DeclarationStatement {
  return isCodeDeclaration(n) && isExported(n.flags)
}

// --
// Legacy imports
// --

export function assertLegacyImport(s: DeclarationStatement): void {
  if (!isLegacyImport(s)) {
    throw new Error('invalid legacy import')
  }
}

export function isLegacyImport(s: DeclarationStatement): boolean {
  return !!s.decorators?.some(d => {
    return (<IdentifierExpression>d.name).text === 'imported' &&
      d.args?.length &&
      d.args[0].kind === NodeKind.Literal
  })
}

export function getLegacyImportPkgId(n: DecoratorNode): string {
  return (<StringLiteralExpression>n.args![0]).value
}