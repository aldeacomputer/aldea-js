import {
  Abi,
  ExportNode,
  ImportNode,
  CodeKind,
  ClassNode,
  FunctionNode,
  InterfaceNode,
  FieldNode,
  FieldKind,
  MethodNode,
  MethodKind,
  ArgNode,
  normalizeTypeName
} from '@aldea/core/abi'

/**
 * Writes a dependency type declarations for the given ABI.
 */
export function writeDependency(abi: Abi): string {
  const groupedImports = abi.imports.reduce(groupImports, new Map())
  const importsCode = [...groupedImports.entries()].map(writeImport)
  const exportsCode = abi.exports.map(writeExport)
  return `
${importsCode.join('\n')}

${exportsCode.join('\n\n')}
`.trim()
}

// Reducer function for grouping imports
function groupImports(
  map: Map<string, string[]>,
  im: ImportNode
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

// Writes an export statement for the given ExportNode
function writeExport(ex: ExportNode): string {
  switch (ex.kind) {
    case CodeKind.CLASS: return writeClass(ex.code as ClassNode)
    case CodeKind.FUNCTION: return writeFunction(ex.code as FunctionNode)
    case CodeKind.INTERFACE: return writeInterface(ex.code as InterfaceNode)
    default: throw new Error(`unknown code kind: ${ex.kind}`)
  }
}

// Writes a class declaration for the given ClassNode
function writeClass(code: ClassNode): string {
  const impl = code.implements.length ?
    ` implements ${code.implements.map(i => i.name).join(', ')}` :
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

  return `
export declare interface ${code.name} extends ${code.extends} {
  ${fields.join('\n  ')}
  ${methods.join('\n  ')}
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
  let mod = ''
  if (f.kind === FieldKind.PRIVATE) { mod = 'private ' }
  if (f.kind === FieldKind.PROTECTED) { mod = 'protected ' }
  return `${mod}${f.name}: ${normalizeTypeName(f.type)};`
}

// Writes a method statement for the given MethodNode
function writeMethod(m: MethodNode | FunctionNode): string {
  const rtype = !('kind' in m) || m.kind !== MethodKind.CONSTRUCTOR ?
    `: ${normalizeTypeName(m.rtype)}` :
    ''

  const args = m.args.map(writeArg)
  return `${m.name}(${args.join(', ')})${rtype};`
}

// Writes an typed arg statement for the given ArgNode
function writeArg(a: ArgNode): string {
  return `${a.name}: ${normalizeTypeName(a.type)}`
}
