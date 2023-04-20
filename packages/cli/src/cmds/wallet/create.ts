import fs from 'fs'
import { join } from 'path'
import { createCommand, createOption } from 'commander'
import { bold } from 'kolorist'
import { log, ok } from '../../log.js'
import { env } from '../../env.js'

// Create wallet command
export const create = createCommand('wallet.create')
  .alias('wc')
  .description('Create a new wallet in the current directory')
  .addOption(createOption('-f, --force', 'Force create').default(false))
  .addOption(createOption('-t, --type <type>', 'Wallet type').choices(['hd', 'sk']).default('hd'))
  .action(createWallet)

// Create wallet action
async function createWallet({ force, type }: { force: boolean, type: string }) {
  log(bold('Creating new wallet...'))
  log()

  const cwd = process.cwd()
  const dir = join(cwd, '.aldea')

  if (fs.existsSync(dir) && !force) {
    throw new Error('Wallet already exists. Invoke command with -f to overwrite.')
  }

  await env.initWallet(dir, type)

  ok('Generated new keys')
  ok(`${type === 'hd' ? 'HD' : 'Single-key'} wallet created`)
  log()
}

