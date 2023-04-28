import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { program, OptionValues } from 'commander'
import { Config } from './config.js'
import { env } from './globals.js'
import { log, err, logErrAndQuit } from './log.js'
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
  .usage('<command> [options]')
  .option('-N --node <url>', 'Aldea node URL')
  .addCommand(cmds.pkg.deploy)
  .addCommand(cmds.wallet.init)
  .addCommand(cmds.wallet.balance)
  .addCommand(cmds.wallet.topup)
  .showHelpAfterError()
  .version(pkg.version)
  .hook('preAction', (cmd) => {
    env.configure(optsToConfig(cmd.opts()))
    cmd.opts()
  })
  
;(async _ => {
  try {
    log()
    await program.parseAsync()
    if (process.argv.length <= 2 || !program.commands.length) {
      program.outputHelp()
    }
  } catch(e: unknown) {
    await logErrAndQuit(e as Error)
  }
})()

function optsToConfig(opts: OptionValues): Partial<Config> {
  const optsToConfDictionary: any = {
    node: 'nodeUrl'
  }

  return Object.keys(opts).reduce<Partial<Config>>((conf, key) => {
    if (Object.hasOwn(optsToConfDictionary, key)) {
      const k: keyof Config = optsToConfDictionary[key]
      conf[k] = opts[key]
    }
    return conf
  }, {})
}
