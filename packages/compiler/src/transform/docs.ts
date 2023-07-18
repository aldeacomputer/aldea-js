import { parse } from 'comment-parser'
import { ClassNode, InterfaceNode, MethodKind, MethodNode, normalizeNodeName } from '@aldea/core/abi'
import { TransformGraph } from './graph/index.js'
import { ClassDeclaration, DeclarationStatement, InterfaceDeclaration, NodeKind } from 'assemblyscript'
import { isConstructor, isInstance, isStatic } from './filters.js'

const PKGDOC_BLOCK_REGEX = /^\s*\/\*\*(?:(?!\*\/).)+\*\//s
const COMMENT_BLOCK_REGEX = /\/\*\*(?:(?!\*\/).)+\*\/\s*$/s

interface Docs {
  package: PackageInfo;
  docs: DocMap;
}

interface PackageInfo {
  description: string;
  tags: Tag[];
}

interface Tag {
  tag: string;
  name: string;
  description: string;
}

interface DocMap {
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
        docs.package = info
        return true
      }
    }
  })

  // 2. parse comments for all exports
  ctx.exports.forEach(ex => {
    parseCommentBlock(ex.code.node, ex.code.name)

    const abiNode = ex.code.abiNode as ClassNode | InterfaceNode
    const members = (<ClassDeclaration | InterfaceDeclaration>ex.code.node).members
    if (ex.code.node.kind === NodeKind.ClassDeclaration || ex.code.node.kind === NodeKind.InterfaceDeclaration) {
      abiNode.fields.forEach(n => {
        const node = members.find(m => m.kind === NodeKind.FieldDeclaration && m.name.text === n.name)!
        parseCommentBlock(node, normalizeNodeName(n, abiNode), true)
      })
      abiNode.methods.forEach(n => {
        if (ex.code.node.kind === NodeKind.ClassDeclaration) {
          const isFlagged = (flags: number) => {
            switch ((<MethodNode>n).kind) {
              case MethodKind.STATIC: return isStatic(flags)
              case MethodKind.CONSTRUCTOR: return isConstructor(flags)
              default: return isInstance(flags)
            }
          }
          
          const node = members.find(m => m.kind === NodeKind.MethodDeclaration && isFlagged(m.flags) && m.name.text === n.name)!
          parseCommentBlock(node, normalizeNodeName(n, abiNode), true)
        } else {
          const node = members.find(m => m.kind === NodeKind.MethodDeclaration && m.name.text === n.name)!
          parseCommentBlock(node, normalizeNodeName(n, abiNode), true)
        }
        
      })

      ;
      (<ClassDeclaration | InterfaceDeclaration>ex.code.node).members.forEach(m => {
        abiNode.fields.some(f => f.name === m.name.text)
        if (m.kind === NodeKind.FieldDeclaration && abiNode.fields.some(f => f.name === m.name.text)) {
          parseCommentBlock(m, `${ex.code.name}.${m.name.text}`, true)
        }
        if (m.kind === NodeKind.MethodDeclaration && abiNode.methods.some(f => f.name === m.name.text)) {
          
        }
      })
    }
  })

  // 3. parse comments for plain objects
  ctx.objects.forEach(obj => {
    parseCommentBlock(obj.node, obj.name)
  })

  return docs
}
