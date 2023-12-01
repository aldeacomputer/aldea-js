import fs from 'fs'
import { join } from 'path'
import { abiToJson } from '@aldea/core'
import { Abi, ProxyNode } from '@aldea/core/abi'
import { writeDependency } from '@aldea/compiler'
import { env } from '../../globals.js'

/**
 * Asserts the given string is a possible package ID
 */
export function assertPkgID(str: string) {
  if (!/^[a-f0-9]{64}$/i.test(str)) {
    throw new Error(`invalid package ID: ${str}`)
  }
}

/**
 * Reducer function for building map of deps
 */
export async function buildDepsMap(
  pkgsP: Promise<Map<string, Abi>>,
  pkgId: string
): Promise<Map<string, Abi>> {
  const pkgs = await pkgsP
  if (!pkgs.has(pkgId)) {
    const abi = await env.aldea.getPackageAbi(pkgId)
    pkgs.set(pkgId, abi)
    await abi.imports.map(i => (<ProxyNode>abi.defs[i]).pkg).reduce(buildDepsMap, Promise.resolve(pkgs))
  }
  return pkgs
}

/**
 * Creates the dependency
 */
export function saveDepFile(pkgId: string, abi: Abi) {
  const path = join(env.codeDir, '.packages', pkgId)
  if (!fs.existsSync(path)) { fs.mkdirSync(path, { recursive: true }) }
  fs.writeFileSync(join(path, 'abi.json'), abiToJson(abi, 2))
  fs.writeFileSync(join(path, 'index.js'), writeDependency(abi))
}
