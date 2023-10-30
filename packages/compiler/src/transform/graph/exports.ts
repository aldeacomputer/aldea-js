import {
  DeclarationStatement,
  ExportDefaultStatement,
  ExportMember,
  ExportStatement,
} from 'assemblyscript'

import {
  CodeNode,
  SourceNode,
  TransformGraph,
} from './index.js'

import {
  isExportDefaultStatement,
  isExportMember,
  isExportStatement,
} from './helpers.js'
import { ClassNode, CodeKind, ExportCode, FunctionNode, InterfaceNode, ObjectNode } from '@aldea/core/abi';

export class ExportNode {
  path?: string;
  internalPath?: string;
  edges: ExportEdge[];

  constructor(
    public src: SourceNode,
    public node: ExportStatement | ExportDefaultStatement | DeclarationStatement
  ) {
    if (isExportStatement(node)) {
      this.path = node.path?.value
      this.internalPath = node.internalPath || undefined
      this.edges = node.members!.map(n => new ExportEdge(this, n))
    } else if (isExportDefaultStatement(node)) {
      this.edges = [new ExportEdge(this, node.declaration, true)]
    } else {
      this.edges = [new ExportEdge(this, node)]
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

export class ExportEdge {
  name: string;
  exportedName: string;

  constructor(
    public ctx: ExportNode,
    public node: ExportMember | DeclarationStatement,
    isDefault?: boolean
  ) {
    if (isExportMember(node)) {
      this.name = node.localName.text
      this.exportedName = node.exportedName.text
    } else {
      this.name = node.name.text
      this.exportedName = isDefault ? 'default' : node.name.text
    }
  }

  get abiCodeKind(): CodeKind {
    return this.code.abiCodeKind
  }

  get abiNode(): ExportCode {
    return this.code.abiNode
  }

  get code(): CodeNode {
    const code = this.ctx.module.findCode(this.name)
    if (!code) throw new Error(`could not find code: ${this.name}`)
    return code
  }
}
