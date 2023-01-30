import { parse } from 'comment-parser'
import { CodeKind, normalizeNodeName } from '../abi.js';
import { TransformCtx } from './ctx.js'
import { ClassWrap, FieldWrap, FunctionWrap, InterfaceWrap, MethodWrap } from './nodes.js'

const COMMENT_BLOCK_REGEX = /\/\*\*(?:(?!\*\/).)+\*\/\s*$/s

interface DocMap {
  [name: string]: string;
}

/**
 * Parses comment blocks from the given context's sources and returns a
 * DocMap object.
 */
export function createDocs(ctx: TransformCtx): DocMap {
  const docs: DocMap = {}
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
        docs[name] = parsedDocs[0].description
      }
    }

    open = parent ? n.node.range.end : n.node.range.start
  }

  ctx.exports.forEach(ex => {
    parseCommentBlock(ex.code as ClassWrap | FunctionWrap | InterfaceWrap)

    if (ex.kind === CodeKind.CLASS || ex.kind === CodeKind.INTERFACE) {
      const code = ex.code as ClassWrap | InterfaceWrap
      code.fields.forEach(n => parseCommentBlock(n as FieldWrap, code))
      code.methods.forEach(n => parseCommentBlock(n as MethodWrap, code))
    }
  })

  return docs
}
