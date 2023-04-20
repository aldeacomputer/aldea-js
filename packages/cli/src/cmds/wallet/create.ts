import fs from 'fs'
import { join } from 'path'
import { createCommand, createOption } from 'commander'
import {} from 'kolorist'
import { WalletFS } from './wallet-fs.js'

// Create wallet command
export const create = createCommand('wallet.create')
    .alias('wc')
    .description('Create a new wallet in the current directory')
    .addOption(createOption('-f, --force', 'Force create').default(false))
    .addOption(createOption('-t, --type <type>', 'Wallet type').choices(['hd', 'sk']).default('hd'))
    .action(createWallet)

// Create wallet action
async function createWallet({ force, type }: { force: boolean, type: string }) {
  console.log('Creating new wallet...')

  const cwd = process.cwd()
  const dir = join(cwd, '.aldea')

  if (fs.existsSync(dir) && !force) {
    throw new Error('Wallet already exists. Invoke command with -f to overwrite.')
  }

  console.log({ force, type })
  const wallet = await WalletFS.init(dir, type)

  console.log('Wallet created')
}

