import fs from 'fs'
import fg from 'fast-glob'
import { basename, join } from 'path'
import { createCommand, createArgument } from 'commander'
import { dim, bold } from 'kolorist'
import { PackageParser } from '@aldea/compiler'
import { log, ok } from '../../log.js'
import { env } from '../../globals.js'
import { buildDepsMap, saveDepFile } from './helpers.js'

// Get deps command
export const get = createCommand('deps.get')
  .alias('dg')
  .description('Fetch all package dependencies')
  .addArgument(createArgument('[entry...]', 'One or more entry files'))
  .action(getDeps)

// Get deps action
async function getDeps(entries: string[]) {
  log(bold('Installing dependencies...'))
  log()

  if (!entries.length) {
    entries = fg.sync(join(env.codeDir, '*.ts')).map(p => basename(p))
  }

  log('Fetching dependencies for:')
  log()
  entries.forEach(e => log(' ', dim('-'), e))
  log()

  const pkg = await PackageParser.create(entries, {
    getSrc: (fileName) => fs.readFileSync(join(env.codeDir, fileName), 'utf8'),
    getDep: (pkgId) => {
      const path = join(env.codeDir, '.packages', pkgId, 'index.ts')
      if (fs.existsSync(path)) { return fs.readFileSync(path, 'utf8') }
    }
  })

  if (pkg.requiredDeps.length) {
    log(`Detected ${bold(pkg.requiredDeps.length)} uninstalled dependencies`)
    log()
    pkg.requiredDeps.forEach(pkgId => log(' ', dim('-'), pkgId))
    log()

    await pkg.requiredDeps.reduce(buildDepsMap, Promise.resolve(new Map()))
      .then(depsMap => {
        depsMap.forEach((abi, pkgId) => saveDepFile(pkgId, abi))
      })
  }
  
  ok('All dependencies are installed')
  log()
}

