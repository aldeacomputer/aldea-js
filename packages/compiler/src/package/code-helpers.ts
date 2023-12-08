import {
  Abi,
  CodeKind,
  ClassNode,
  FunctionNode,
  InterfaceNode,
  FieldNode,
  MethodNode,
  MethodKind,
  ArgNode,
  normalizeTypeName,
  CodeDef,
  ObjectNode,
  ProxyNode,
  AbiQuery
} from '@aldea/core/abi'

/**
 * Writes a dependency type declarations for the given ABI.
 */
export function writeDependency(abi: Abi): string {
  const groupedImports = abi.imports.map(i => abi.defs[i] as ProxyNode).reduce(groupImports, new Map())
  const importsCode = [...groupedImports.entries()].map(writeImport)
  const exportsCode = abi.exports.map(i => abi.defs[i]).map(writeExport)
  return `
${importsCode.join('\n')}

${exportsCode.join('\n\n')}
`.trim()
}

// Reducer function for grouping imports
function groupImports(
  map: Map<string, string[]>,
  im: ProxyNode,
): Map<string, string[]> {
  const list = map.get(im.pkg)
  if (list) {
    list.push(im.name)
  } else {
    map.set(im.pkg, [im.name])
  }
  return map
}

// Writes and import statement for the given package ID and names
function writeImport([pkgId, names]: [string, string[]]): string {
  return `import { ${names.join(', ')} } from 'pkg://${pkgId}'`
}

// Writes an export statement for the given CodeDef
function writeExport(ex: CodeDef): string {
  switch (ex.kind) {
    case CodeKind.CLASS: return writeClass(ex)
    case CodeKind.FUNCTION: return writeFunction(ex)
    case CodeKind.INTERFACE: return writeInterface(ex)
    case CodeKind.OBJECT: return writeObject(ex)
    default: throw new Error(`unknown code kind: ${ex.kind}`)
  }
}

// Writes a class declaration for the given ClassNode
function writeClass(code: ClassNode): string {
  const impl = code.implements.length ?
    ` implements ${code.implements.join(', ')}` :
    ''  

  const fields = code.fields.map(writeField)
  const methods = code.methods.map(writeMethod)

  return `
export declare class ${code.name} extends ${code.extends}${impl} {
  ${fields.join('\n  ')}
  ${methods.join('\n  ')}
}
`.trim()
}

// Writes an interface declaration for the given InterfaceNode
function writeInterface(code: InterfaceNode): string {
  const fields = code.fields.map(writeField)
  const methods = code.methods.map(writeMethod)
  const extendsFrom = code.extends.length ? `extends ${ code.extends.join(', ') }` : ''

  return `
export declare interface ${code.name} ${extendsFrom} {
  ${fields.join('\n  ')}
  ${methods.join('\n  ')}
}
`.trim()
}

// TODO
function writeObject(code: ObjectNode): string {
  const fields = code.fields.map(writeField)

  return `
export declare class ${code.name} {
  ${fields.join('\n  ')}
}
`.trim()
}

// Writes a function declaration for the given FunctionNode
function writeFunction(f: FunctionNode): string {
  const args = f.args.map(writeArg)
  return `export declare function ${f.name}(${args.join(', ')}): ${normalizeTypeName(f.rtype)};`
}

// Writes a field statement for the given FieldNode
function writeField(f: FieldNode): string {
  return `${f.name}: ${normalizeTypeName(f.type)};`
}

// Writes a method statement for the given MethodNode
function writeMethod(m: MethodNode): string {
  const args = m.args.map(writeArg)
  const rtype = m.name === 'constructor' ? '' : `: ${normalizeTypeName(m.rtype)}`
  return `${m.name}(${args.join(', ')})${rtype};`
}

// Writes an typed arg statement for the given ArgNode
function writeArg(a: ArgNode): string {
  return `${a.name}: ${normalizeTypeName(a.type)}`
}
