import fs from 'fs'
import { createCommand, createOption } from 'commander'
import { bold } from 'kolorist'
import { log, ok } from '../../log.js'
import { env } from '../../globals.js'

// Init wallet command
export const init = createCommand('wallet.init')
  .alias('wi')
  .description('Create a new wallet in the current directory')
  .addOption(createOption('-f, --force', 'Force create').default(false))
  .addOption(createOption('-t, --type <type>', 'Wallet type').choices(['hd', 'sk']).default('sk'))
  .action(createWallet)

// Create wallet action
async function createWallet({ type, force }: { type: string, force: boolean }) {
  log(bold('Creating new wallet...'))
  log()

  if (fs.existsSync(env.walletDir) && !force) {
    throw new Error('Wallet already exists. Invoke command with -f to overwrite.')
  }

  await env.initWallet(type)

  ok('Generated new keys')
  ok(`${type === 'hd' ? 'HD' : 'Single-key'} wallet created`)
  log()
}

