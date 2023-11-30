import {
  DeclarationStatement,
  ExportDefaultStatement,
  ExportStatement,
  ImportStatement,
  Source,
} from 'assemblyscript'

import {
  TransformGraph,
  ImportNode,
  ExportNode,
  CodeNode,
} from './index.js'

import {
  isCodeDeclaration,
  isExportDefaultStatement,
  isExportStatement,
  isImportStatement,
  isLegacyImport,
  isNamedExport,
} from './helpers.js'

export class SourceNode {
  internalPath: string;
  imports: ImportNode[];
  exports: ExportNode[];
  codes: CodeNode[];
  #idx?: number;

  constructor(
    public ctx: TransformGraph,
    public source: Source,
  ) {
    this.internalPath = source.internalPath

    this.imports = source.statements
      .filter(n => isImportStatement(n))
      .map(n => new ImportNode(this, n as ImportStatement))

    this.exports = source.statements
      .filter(n => isExportStatement(n) || isNamedExport(n))
      .map(n => new ExportNode(this, n as ExportStatement | DeclarationStatement))

    this.codes = source.statements
      .filter(isCodeDeclaration)
      .map(s => new CodeNode(this, s))

    // Add default exports (we dont support these but still must be aware)
    source.statements.filter(isExportDefaultStatement).forEach(n => {
      this.exports.push(new ExportNode(this, n as ExportDefaultStatement))
      this.codes.push(new CodeNode(this, n.declaration))
    })

    // Add legacy imports
    this.codes.forEach(code => {
      if (isLegacyImport(code.node)) {
        this.imports.push(new ImportNode(this, code.node))
      }
    })
  }

  get idx(): number {
    if (typeof this.#idx === 'undefined') {
      // for some bizaro reason, indexOf is unreliable here
      this.#idx = this.ctx.sources.findIndex(src => src.internalPath === this.internalPath)
    }
    return this.#idx
  }

  findCode(name: string): CodeNode | undefined {
    const code = this.codes.find(c => c.name === name)
    if (code) { return code }

    const imported = this.imports
      .flatMap(n => n.edges)
      .find(n => n.name === name)
    if (imported) { return imported.code }

    const exported = this.exports
      .flatMap(n => n.edges)
      .find(n => n.exportedName === name)
    if (exported) { return exported.code }
  }
}


