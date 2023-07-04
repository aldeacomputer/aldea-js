import fs from 'fs'
import { join } from 'path'
import { InvalidArgumentError, createCommand, createArgument } from 'commander'
import { bold } from 'kolorist'
import { abi, abiToJson } from '@aldea/sdk'
import { log, ok } from '../../log.js'
import { env } from '../../globals.js'

// Add deps command
export const add = createCommand('deps.add')
  .alias('da')
  .description('Add dependency by package ID')
  .addArgument(createArgument('<pkg...>', 'One or more package IDs to install'))
  .action(addDeps)

// Add deps action
async function addDeps(pkgs: string[]) {
  log(bold(`Installing dependenc${pkgs.length === 1 ? 'y' : 'ies'}...`))
  log()

  await pkgs.reduce(buildDepsMap, Promise.resolve(new Map()))
    .then(depsMap => {
      depsMap.forEach((abi, pkgId) => createDepFile(pkgId, abi))
    })
  
  for (const id of pkgs) { ok(id) }
  log()
}

// Creates the dependency
function createDepFile(pkgId: string, abi: abi.Abi) {
  const path = join(env.codeDir, '.packages', pkgId)
  if (!fs.existsSync(path)) { fs.mkdirSync(path, { recursive: true }) }
  fs.writeFileSync(join(path, 'abi.json'), abiToJson(abi, 2))
  fs.writeFileSync(join(path, 'index.ts'), writeDepCode(abi))
}

// Reducer function for grouping imports
function groupImports(
  map: Map<string, string[]>,
  im: abi.ImportNode
): Map<string, string[]> {
  const list = map.get(im.pkg)
  if (list) {
    list.push(im.name)
  } else {
    map.set(im.pkg, [im.name])
  }
  return map
}

// Reducer function for building map of deps
async function buildDepsMap(
  pkgsP: Promise<Map<string, abi.Abi>>,
  pkgId: string
): Promise<Map<string, abi.Abi>> {
  const pkgs = await pkgsP
  if (!pkgs.has(pkgId)) {
    const abi = await env.aldea.getPackageAbi(pkgId)
    pkgs.set(pkgId, abi)
    await abi.imports.map(i => i.pkg).reduce(buildDepsMap, Promise.resolve(pkgs))
  }
  return pkgs
}

// Parse package id
function parsePkgId(value: string): string {
  if (!/^([a-f0-9]{2}){32}$/i.test(value)) {
    throw new InvalidArgumentError(`invalid package id`)
  }
  return value
}

function writeDepCode(abi: abi.Abi): string {
  const groupedImports = abi.imports.reduce(groupImports, new Map())
  const importsCode = [...groupedImports.entries()].map(writeImport)
  const exportsCode = abi.exports.map(writeExport)
  return `
${importsCode.join('\n')}

${exportsCode.join('\n\n')}
`.trim()
}

function writeImport([pkgId, names]: [string, string[]]): string {
  return `import { ${names.join(', ')} } from 'pkg://${pkgId}'`
}

function writeExport(ex: abi.ExportNode): string {
  switch (ex.kind) {
    case abi.CodeKind.CLASS: return writeClass(ex.code as abi.ClassNode)
    case abi.CodeKind.FUNCTION: return writeFunction(ex.code as abi.FunctionNode)
    case abi.CodeKind.INTERFACE: return writeInterface(ex.code as abi.InterfaceNode)
    default: throw new Error(`unknown code kind: ${ex.kind}`)
  }
}

function writeClass(code: abi.ClassNode): string {
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

function writeInterface(code: abi.InterfaceNode): string {
  const fields = code.fields.map(writeField)
  const methods = code.methods.map(writeMethod)

  return `
export declare interface ${code.name} extends ${code.extends} {
  ${fields.join('\n  ')}
  ${methods.join('\n  ')}
}
`.trim()
}

function writeFunction(f: abi.FunctionNode): string {
  const args = f.args.map(writeArg)
  return `export declare function ${f.name}(${args.join(', ')}): ${abi.normalizeTypeName(f.rtype)};`
}

function writeField(f: abi.FieldNode): string {
  let mod = ''
  if (f.kind === abi.FieldKind.PRIVATE) { mod = 'private ' }
  if (f.kind === abi.FieldKind.PROTECTED) { mod = 'protected ' }
  return `${mod}${f.name}: ${abi.normalizeTypeName(f.type)};`
}

function writeMethod(m: abi.MethodNode | abi.FunctionNode): string {
  const rtype = !('kind' in m) || m.kind !== abi.MethodKind.CONSTRUCTOR ?
    `: ${abi.normalizeTypeName(m.rtype)}` :
    ''

  const args = m.args.map(writeArg)
  return `${m.name}(${args.join(', ')})${rtype};`
}

function writeArg(a: abi.ArgNode): string {
  return `${a.name}: ${abi.normalizeTypeName(a.type)}`
}