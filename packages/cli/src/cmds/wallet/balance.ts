import { createCommand } from 'commander'
import { bold, dim,  lightBlue } from 'kolorist'
import { Pointer } from '@aldea/sdk-js'
import { log } from '../../log.js'
import { env } from '../../globals.js'

const COIN_PTR = Pointer.fromString('0000000000000000000000000000000000000000000000000000000000000000_0')

// Wallet balance command
export const balance = createCommand('wallet.balance')
  .alias('wb')
  .description('Show your wallet balance')
  .action(walletBalance)

// Wallet balance action
async function walletBalance() {
  log(bold('Fetching wallet balance...'))
  log()

  await env.loadWallet()
  await env.wallet.sync()

  const outputs = await env.wallet.getInventory()
  const motos = outputs
    .filter(o => o.classPtr.equals(COIN_PTR))
    .reduce((sum, o) => sum += (<{ motos: number }>o.props).motos, 0)

  log(lightBlue('  ₳'), formatMotos(motos))
  log()
}

function formatMotos(motos: number): string {
  const ms = motos.toString()
  const mf = (motos/100000000).toFixed(8)
  return dim(mf.slice(0, mf.length - ms.length)) + ms
}
