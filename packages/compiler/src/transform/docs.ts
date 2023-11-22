import { parse } from 'comment-parser'
import { ClassNode, CodeKind, InterfaceNode, MethodKind, MethodNode, ObjectNode, normalizeNodeName } from '@aldea/core/abi'
import { TransformGraph } from './graph/index.js'
import { ClassDeclaration, DeclarationStatement, InterfaceDeclaration, NodeKind } from 'assemblyscript'
import { isConstructor, isInstance, isStatic } from './filters.js'

const PKGDOC_BLOCK_REGEX = /^\s*\/\*\*(?:(?!\*\/).)+\*\//s
const COMMENT_BLOCK_REGEX = /\/\*\*(?:(?!\*\/).)+\*\/\s*$/s

export interface Docs {
  pkg: PackageInfo;
  docs: DocMap;
}

export interface PackageInfo {
  description: string;
  tags: Tag[];
}

export interface Tag {
  tag: string;
  name: string;
  description: string;
}

export interface DocMap {
  [name: string]: string;
}

/**
 * Parses comment blocks from the given context's sources and returns a
 * DocMap object.
 */
export function createDocs(ctx: TransformGraph): Partial<Docs> {
  const docs: Partial<Docs> = {}
  let open = 0

  function parseCommentBlock(
    node: DeclarationStatement,
    name: string,
    child?: boolean,
  ): void {
    const src  = node.range.source
    const comments = src.text.slice(open, node.range.start).match(COMMENT_BLOCK_REGEX)
    
    if (comments?.length) {
      const parsedDocs = parse(comments[0], { spacing: 'preserve' })
      if (parsedDocs.length && parsedDocs[0].description) {
        docs.docs ||= {}
        docs.docs[name] = parsedDocs[0].description.trim()
      }
    }

    open = child ? node.range.end : node.range.start
  }

  // 1. try to parse a Package Info Block
  ctx.entries.some(src => {
    const pkgdoc = src.source.text.match(PKGDOC_BLOCK_REGEX)
    if (pkgdoc?.length) {
      const parsed = parse(pkgdoc[0], { spacing: 'preserve' })
      if (parsed.length && parsed[0].tags.map((t: any) => t.tag).includes('package')) {
        const info: PackageInfo = {
          description: parsed[0].description.trim(),
          tags: parsed[0].tags.map(({ tag, name, description}: any) => (
            { tag, name, description }
          ))
        }
        docs.pkg = info
        return true
      }
    }
  })

  // 2. parse comments for all exports
  ctx.exports.forEach(ex => {
    parseCommentBlock(ex.code.node, ex.code.name)
    const abiKind = ex.code.abiCodeKind
    const abiNode = ex.code.abiNode as ClassNode | InterfaceNode
    const members = (<ClassDeclaration | InterfaceDeclaration>ex.code.node).members

    if ([CodeKind.CLASS, CodeKind.INTERFACE, CodeKind.OBJECT].includes(abiKind)) {
      abiNode.fields.forEach(n => {
        const node = members.find(m => m.kind === NodeKind.FieldDeclaration && m.name.text === n.name)
        if (node) parseCommentBlock(node, normalizeNodeName(n, abiNode), true)
      })
    }

    if ([CodeKind.CLASS, CodeKind.INTERFACE].includes(abiKind)) {
      abiNode.methods.forEach(n => {
        if (ex.code.node.kind === NodeKind.ClassDeclaration) {
          const isFlagged = (flags: number) => {
            return (<MethodNode>n).name === 'constructor' ? isConstructor(flags) : isInstance(flags)
          }
          
          const node = members.find(m => m.kind === NodeKind.MethodDeclaration && isFlagged(m.flags) && m.name.text === n.name)
          if (node) parseCommentBlock(node, normalizeNodeName(n, abiNode), true)
        } else {
          const node = members.find(m => m.kind === NodeKind.MethodDeclaration && m.name.text === n.name)
          if (node) parseCommentBlock(node, normalizeNodeName(n, abiNode), true)
        }
      })
    }
  })

  return docs
}
