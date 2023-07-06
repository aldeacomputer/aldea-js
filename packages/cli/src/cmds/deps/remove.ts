import fs from 'fs'
import { join } from 'path'
import { createCommand, createArgument } from 'commander'
import { bold, dim } from 'kolorist'
import { log, ok } from '../../log.js'
import { env } from '../../globals.js'
import { assertPkgID } from './helpers.js'

// Remove deps command
export const remove = createCommand('deps.remove')
  .alias('dr')
  .description('Remove dependency by package ID')
  .addArgument(createArgument('<pkg...>', 'One or more package IDs to remove'))
  .action(removeDeps)

// Remove deps action
async function removeDeps(pkgs: string[]) {
  const noun = `dependenc${pkgs.length === 1 ? 'y' : 'ies'}`
  log(bold(`Removing ${noun}...`))
  log()

  pkgs.forEach(assertPkgID)

  for (const pkgId of pkgs) {
    const path = join(env.codeDir, '.packages', pkgId)
    if (fs.existsSync(path)) {
      fs.rmSync(path, { recursive: true })
      log(' ', dim('-'), pkgId)
    }
  }
  
  log()
  ok(`${noun.replace(/^d/, 'D')} successfully removed`)
  log()
}
