import {
  DeclarationStatement,
  ImportDeclaration,
  ImportStatement,
} from 'assemblyscript'

import {
  CodeNode,
  SourceNode,
  TransformGraph,
} from './index.js'

import {
  assertLegacyImport,
  isImportDeclaration,
  isImportStatement,
  getLegacyImportPkgId,
} from './helpers.js'

export class ImportNode {
  path?: string;
  internalPath?: string;
  edges: ImportEdge[];

  constructor(
    public src: SourceNode,
    public node: ImportStatement | DeclarationStatement,
  ) {
    if (isImportStatement(node)) {
      this.path = node.path.value
      this.internalPath = node.internalPath
      this.edges = node.declarations?.map(n => new ImportEdge(this, n)) || []
    } else {
      assertLegacyImport(node)
      this.edges = [new ImportEdge(this, node)]
    }
  }

  get graph(): TransformGraph {
    return this.src.ctx
  }

  get module(): SourceNode {
    if (typeof this.internalPath === 'string') {
      const src = this.graph.sources.find(s => s.internalPath === this.internalPath)
      if (!src) throw new Error(`could not find source: ${this.internalPath}`)
      return src
    } else {
      return this.src
    }
  }
}

export class ImportEdge {
  name: string;
  foreignName: string;
  pkgId?: string;

  constructor(
    public ctx: ImportNode,
    public node: ImportDeclaration | DeclarationStatement
  ) {
    if (isImportDeclaration(node)) {
      this.name = node.name.text
      this.foreignName = node.foreignName.text
      const m = ctx.path!.match(/^pkg:\/\/(([a-f0-9]{2})+)/)
      if (m) this.pkgId = m[1]
    } else {
      assertLegacyImport(node)
      this.name = node.name.text
      this.foreignName = node.name.text
      this.pkgId = getLegacyImportPkgId(node.decorators![0])
    }
  }

  get code(): CodeNode {
    const code = this.ctx.module.findCode(this.foreignName)
    if (!code) throw new Error(`could not find code: ${this.foreignName}`)
    return code
  }

  get isDep(): boolean {
    return typeof this.pkgId === 'string'
  }

  get isLegacy(): boolean {
    return this.isDep && !isImportDeclaration(this.node)
  }
}
