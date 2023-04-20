import { join } from 'path'
import { createCommand } from 'commander'
import { bold } from 'kolorist'
import { log, ok } from '../../log.js'
import { env } from '../../env.js'

// Wallet balance command
export const balance = createCommand('wallet.balance')
  .alias('wb')
  .description('Show your wallet balance')
  .action(walletBalance)

// Wallet balance action
async function walletBalance() {
  log(bold('Fetching wallet balance...'))
  log()

  const cwd = process.cwd()
  const dir = join(cwd, '.aldea')
  await env.loadWallet(dir)
  //await env.wallet.sync()

  const outputs = await env.wallet.getInventory()
  console.log(outputs)

}

