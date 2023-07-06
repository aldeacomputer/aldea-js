import fs from 'fs'
import fg from 'fast-glob'
import { basename, join } from 'path'
import { createCommand, createArgument } from 'commander'
import { bgRed, bold, dim } from 'kolorist'
import { PackageParser } from '@aldea/compiler'
import { err, log, ok } from '../../log.js'
import { env } from '../../globals.js'

// List deps command
export const list = createCommand('deps.list')
  .alias('dl')
  .description('List all package dependencies')
  .addArgument(createArgument('[entry...]', 'One or more package entries'))
  .action(listDeps)

// List deps action
async function listDeps(entries: string[]) {
  log(bold('Listing dependencies...'))
  log()

  if (!entries.length) {
    entries = fg.sync(join(env.codeDir, '*.ts')).map(p => basename(p))
  }

  log('Listing dependencies for:')
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

  if (pkg.allDeps.length) {
    for (const pkgId of pkg.allDeps) {
      if (pkg.installedDeps.includes(pkgId)) {
        ok(pkgId)
      } else {
        err(bgRed(pkgId))
      }
    }
  } else {
    ok('No dependencies found')
  }
  
  log()
}
