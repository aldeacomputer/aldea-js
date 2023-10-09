import { createCommand, createOption, InvalidArgumentError } from 'commander'
import { bold, dim } from 'kolorist'
import { OutputResponse } from '@aldea/sdk/aldea'
import { log, ok } from '../../log.js'
import { env } from '../../globals.js'

// Topup wallet command
export const topup = createCommand('wallet.topup')
  .alias('wt')
  .description('Topup your wallet with minted coins from the faucet')
  .addOption(createOption('-m, --mint [motos]', 'Amount of topup motos').argParser(toInt))
  .action(walletTopup)

// Topup wallet action
async function walletTopup({ mint }: { mint?: number | boolean }) {
  log(bold('Topping up wallet...'))
  log()

  // Set default if motos not specified
  if (mint === true) mint = 10000
  
  await env.loadWallet()
  const addr = await env.wallet.getNextAddress()

  if (mint) {
    const headers = { 'content-type': 'application/json' }
    const params = { amount: mint, address: addr.toString() }
    // Explicitly set headers and encode json data to work around weirdness
    // in tutorial (webcontainer changing content-type to text/plain) 
    const res = await env.aldea.api.post('mint', { headers, body: JSON.stringify(params) }).json<OutputResponse>()
    const output = await env.aldea.loadOutput(res.id)
    await env.wallet.addUtxo(output)

    ok(`Minted ${mint} motos`)
    ok('Coin added to wallet')
  } else {
    log(dim('  ❯'), 'Send to address:', bold(addr.toString()))
  }
  
  log()
}

// Parses the arg as an integer
function toInt(arg: string) {
  const n = parseInt(arg)
  if (isNaN(n)) throw new InvalidArgumentError('not a number')
  return n
}
