import { parse } from 'comment-parser'
import { CodeKind, normalizeNodeName } from '@aldea/sdk-js/abi';
import { TransformCtx } from './ctx.js'
import { ClassWrap, FieldWrap, FunctionWrap, InterfaceWrap, MethodWrap } from './nodes.js'

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
export function createDocs(ctx: TransformCtx): Partial<Docs> {
  const docs: Partial<Docs> = {}
  let open = 0

  function parseCommentBlock(
    n: ClassWrap | FunctionWrap | InterfaceWrap | FieldWrap | MethodWrap,
    parent?: ClassWrap | InterfaceWrap
  ): void {
    if (typeof n.node === 'undefined') return
    const src  = n.node.range.source
    const comments = src.text.slice(open, n.node.range.start).match(COMMENT_BLOCK_REGEX)
    
    if (comments?.length) {
      const parsedDocs = parse(comments[0], { spacing: 'preserve' })
      if (parsedDocs.length && parsedDocs[0].description) {
        const name = normalizeNodeName(n, parent)
        docs.docs ||= {}
        docs.docs[name] = parsedDocs[0].description.trim()
      }
    }

    open = parent ? n.node.range.end : n.node.range.start
  }

  // 1. try to parse a Package Info Block
  ctx.sources.some(src => {
    const pkgdoc = src.text.match(PKGDOC_BLOCK_REGEX)
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
    parseCommentBlock(ex.code as ClassWrap | FunctionWrap | InterfaceWrap)

    if (ex.kind === CodeKind.CLASS || ex.kind === CodeKind.INTERFACE) {
      const code = ex.code as ClassWrap | InterfaceWrap
      code.fields.forEach(n => parseCommentBlock(n as FieldWrap, code))
      code.methods.forEach(n => parseCommentBlock(n as MethodWrap, code))
    }
  })

  // 3. parse comments for plain objects
  ctx.objects.forEach(obj => parseCommentBlock(obj as ClassWrap))

  return docs
}
