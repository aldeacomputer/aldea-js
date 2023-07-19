import { createCommand, createArgument } from 'commander'
import { bold, dim } from 'kolorist'
import { log, ok } from '../../log.js'
import { assertPkgID, buildDepsMap, saveDepFile } from './helpers.js'

// Add deps command
export const add = createCommand('deps.add')
  .alias('da')
  .description('Add dependency by package ID')
  .addArgument(createArgument('<pkg...>', 'One or more package IDs to install'))
  .action(addDeps)

// Add deps action
async function addDeps(pkgs: string[]) {
  const noun = `dependenc${pkgs.length === 1 ? 'y' : 'ies'}`
  log(bold(`Installing ${noun}...`))
  log()

  pkgs.forEach(assertPkgID)

  await pkgs.reduce(buildDepsMap, Promise.resolve(new Map()))
    .then(depsMap => {
      depsMap.forEach((abi, pkgId) => {
        saveDepFile(pkgId, abi)
        if (pkgs.includes(pkgId)) { log(' ', dim('-'), pkgId) }
      })
    })
  
  log()
  ok(`${noun.replace(/^d/, 'D')} successfully installed`)
  log()
}

