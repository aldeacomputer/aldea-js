import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { program } from 'commander'

import { log, err } from './log.js'
import * as cmds from './cmds/index.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dir, '..', 'package.json'), 'utf8'))

// OK this is horrible, but so are those experimental fetch API warnings
process.removeAllListeners('warning')
process.on('warning', (e) => {
  if (e.name !== 'ExperimentalWarning') { console.warn(e) }
})

program
  .name('aldea')
  .addCommand(cmds.code.deploy)
  .addCommand(cmds.wallet.create)
  .addCommand(cmds.wallet.balance)
  .addCommand(cmds.wallet.topup)
  .version(pkg.version)
  .showHelpAfterError()
  
;(async _ => {
  try {
    log()
    await program.parseAsync()
    if (process.argv.length <= 2 || !program.commands.length) {
      program.outputHelp()
    }
  } catch(e: unknown) {
    if (e instanceof Error) {
      log()
      err(e.message)
      log()
      //log(e.stack)
    }
  }
})()
