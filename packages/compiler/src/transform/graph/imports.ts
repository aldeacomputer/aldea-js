import {
  DeclarationStatement,
  ImportDeclaration,
  ImportStatement,
  NodeKind,
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
import { CodeDef, CodeKind, ImportCode, ObjectNode } from '@aldea/core/abi';

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

  get abiCodeKind(): CodeKind {
    switch(this.code.node.kind) {
      case NodeKind.ClassDeclaration:
        return this.code.isObj ? CodeKind.OBJECT : CodeKind.PROXY_CLASS
      case NodeKind.FunctionDeclaration: return CodeKind.PROXY_FUNCTION
      case NodeKind.InterfaceDeclaration: return CodeKind.PROXY_INTERFACE
      default:
        throw new Error(`unrecognised import kind: ${this.code.node.kind}`)
    }
  }

  get abiNode(): ImportCode {
    if (this.abiCodeKind === CodeKind.OBJECT) {
      return this.code.abiNode as ObjectNode
    } else {
      return {
        kind: this.abiCodeKind as CodeKind.PROXY_CLASS | CodeKind.PROXY_FUNCTION | CodeKind.PROXY_INTERFACE,
        name: this.code.name,
        pkg: this.pkgId!,
      }
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
