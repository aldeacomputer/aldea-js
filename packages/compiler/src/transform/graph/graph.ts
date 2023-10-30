import {
  Class,
  NodeKind,
  Parser,
  Program,
  Source,
} from 'assemblyscript'

import { abi } from '@aldea/core'

import {
  ClassNode,
  FunctionNode,
  InterfaceNode,
  MethodNode,
  ObjectNode,
  TypeNode,
  TypeIdNode,
  normalizeTypeName,
  CodeKind,
  MethodKind,
  CodeDef,
} from '@aldea/core/abi';

import {
  CodeNode,
  ExportEdge,
  ImportEdge,
  SourceNode
} from './index.js'

import {
  isClass,
  isDepSource,
  isUserEntry,
  isUserSource,
  sortSources,
} from './helpers.js'

import { isAmbient } from '../filters.js';
import { Validator } from '../validator.js'

const ABI_VERSION = 1

export class TransformGraph {
  sources: SourceNode[];
  entries: SourceNode[];
  imports: ImportEdge[];
  exports: ExportEdge[];
  exposedTypes = new Map<string, TypeNode>();

  program?: Program;
  #typeIds?: TypeIdNode[];

  constructor(
    public parser: Parser
  ) {
    const userSources = parser.sources
      .filter(s => isUserSource(s) || isDepSource(s))
      .sort(sortSources)

    this.sources = userSources
      .map(s => new SourceNode(this, s))

    this.entries = userSources
      .filter(isUserEntry)
      .map(s => new SourceNode(this, s))

    this.imports = this.sources
      .flatMap(s => s.imports.flatMap(n => n.edges))
      .filter(n => n.isDep)

    this.exports = this.entries
      .flatMap(s => s.exports.flatMap(n => n.edges))

    this.collectExposedTypes()
    this.validate()
  }

  toABI(): abi.Abi {
    const defs = this.getOrderedDefs()
    
    return {
      version: ABI_VERSION,
      imports: defs.reduce(getImportIdx, []),
      exports: defs.reduce(getExportIdx, []),
      defs,
      typeIds: this.mapTypeIds()
    }
  }

  parse(ts: string, path: string): Source {
    const parser = new Parser(this.parser.diagnostics)
    parser.parseFile(ts, path, true)
    return parser.sources[0]
  }

  validate(): void {
    new Validator(this).validate()
  }

  private getOrderedDefs(): CodeDef[] {
    return [...this.imports, ...this.exports]
      .sort((a, b) => {
        if (a.code.src.idx === b.code.src.idx) {
          return a.code.idx - b.code.idx
        } else {
          return a.code.src.idx - b.code.src.idx
        }
      })
      .map(edge => edge.abiNode)
  }

  private collectExposedTypes(): void {
    const setType = (type: TypeNode) => {
      this.exposedTypes.set(normalizeTypeName(type), type)
    }
  
    const applyClass = (obj: ClassNode | ObjectNode | InterfaceNode) => {
      obj.fields.forEach(n => setType(n.type))
      if ("methods" in obj) {
        obj.methods.forEach(n => applyFunction(n as MethodNode))
      }
    }
  
    const applyFunction = (fn: FunctionNode | MethodNode) => {
      fn.args.forEach(n => setType(n.type))
      if (fn.rtype) { setType(fn.rtype) }
    }
  
    const applyCode = (c: CodeNode) => {
      switch (c.node.kind) {
        case NodeKind.ClassDeclaration:
          applyClass(c.abiNode as ClassNode)
          break
        case NodeKind.FunctionDeclaration:
          applyFunction(c.abiNode as FunctionNode)
          break
        case NodeKind.InterfaceDeclaration:
          applyClass(c.abiNode as InterfaceNode)
          break
      }
    }
  
    this.exports.forEach(ex => applyCode(ex.code))
    this.imports.forEach(im => applyCode(im.code))
  }

  private mapTypeIds(): TypeIdNode[] {
    if (!this.program) return []
    if (!this.#typeIds) {

      // Build whitelist
      const whitelist = ['JigInitParams', 'Output', 'Lock', 'Coin']
      this.exports
        .filter(ex => ex.code.isObj)
        .forEach(ex => whitelist.push(ex.name))
      this.imports
        .filter(im => im.code.node.kind === NodeKind.ClassDeclaration)
        .forEach(im => whitelist.push(im.name))

      function whiteListType(type: TypeNode): void {
        const name = normalizeTypeName(type)
        if (!whitelist.includes(name)) { whitelist.push(name) }
        type.args.forEach(whiteListType)
      }

      this.exposedTypes.forEach(whiteListType)

      // Build export list
      const exportList: string[] = []
      this.exports
        .filter(ex => ex.code.isJig)
        .forEach(ex => exportList.push(ex.name))
      
      // Building interface list
      const interfaceList: string[] = []
      this.exports
        .filter(ex => ex.code.node.kind === NodeKind.InterfaceDeclaration)
        .forEach(ex => interfaceList.push(ex.name))

      this.imports
        .filter(im => im.code.node.kind === NodeKind.InterfaceDeclaration)
        .forEach(im => interfaceList.push(im.name))

      this.#typeIds = [...this.program.managedClasses].reduce((arr: TypeIdNode[], [id, klass]) => {
        const name = normalizeClassName(klass)
        // whitelisted names go in as they are
        if (
          whitelist.includes(name) &&
          name !== 'Jig' &&
          !exportList.includes(name) &&
          !interfaceList.includes(name)
        ) {
          arr.push({ id, name })
        }
        // the basejig is simply known as... Jig
        if (name === '_BaseJig') {
          arr.push({ id, name: 'Jig' })
        }
        // for local jigs we rename to the original with $ prefix
        if (/^_Local/.test(name)) {
          const lname = name.replace(/^_Local/, '')
          if (exportList.includes(lname)) {
            arr.push({ id, name: `$${lname}` })
          }
        }
        // for remote jigs and interfaces we rename to the original
        if (/^_Remote/.test(name)) {
          const rname = name.replace(/^_Remote/, '')
          if (exportList.includes(rname) || interfaceList.includes(rname)) {
            arr.push({ id, name: rname })
          }
        }
        return arr
      }, []).sort((a, b) => a.id - b.id)
    }
    return this.#typeIds
  }
}

function isExposed(code: CodeNode, obj: CodeNode): boolean {
  switch (code.abiCodeKind) {
    case CodeKind.CLASS:
    case CodeKind.INTERFACE:
      type T = ClassNode | InterfaceNode
      return (<T>code.abiNode).fields.some(f => f.type.name === obj.name) ||
        (<T>code.abiNode).methods.some(m => m.args.some(a => a.type.name === obj.name)) ||
        (<T>code.abiNode).methods.some(m => m.rtype?.name === obj.name)
    case CodeKind.FUNCTION:
      return (<FunctionNode>code.abiNode).args.some(a => a.type.name === obj.name) ||
        (<FunctionNode>code.abiNode).rtype.name === obj.name
    case CodeKind.OBJECT:
      return (<ObjectNode>code.abiNode).fields.some(f => f.type.name === obj.name)
    default:
      return false
  }
}

function getImportIdx(idxs: number[], code: CodeDef, idx: number): number[] {
  if (code.kind >= CodeKind.PROXY_CLASS) { idxs.push(idx) }
  return idxs
}

function getExportIdx(idxs: number[], code: CodeDef, idx: number): number[] {
  if (code.kind < CodeKind.PROXY_CLASS) { idxs.push(idx) }
  return idxs
}

function toAbiClass(abiNode: ClassNode): ClassNode {
  const methods = abiNode.methods
  if (!methods.some(m => m.kind === MethodKind.CONSTRUCTOR)) {
    methods.unshift({
      kind: MethodKind.CONSTRUCTOR,
      name: 'constructor',
      args: [],
      rtype: null,
    })
  }
  return { ...abiNode, methods }
}

// Normalizes class name to match normalized type name
function normalizeClassName(klass: Class): string {
  const name = klass.name.replace(/^(\w+)<.*>$/, '$1')
  const args = klass.typeArguments?.map(t => {
    return t.classReference ? normalizeClassName(t.classReference) : t.toString()
  })

  return normalizeName(name) +  (args ? `<${ args.join(',') }>` : '')
}

// Lower case string to match our typeings
const normalizeName = (n: string) => n === 'String' ? n.toLowerCase() : n
