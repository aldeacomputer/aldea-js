import { join } from 'path'
import { createCommand, createArgument, InvalidArgumentError } from 'commander'
import { bold } from 'kolorist'
import { OutputResponse } from '@aldea/sdk-js/aldea'
import { log, ok } from '../../log.js'
import { env } from '../../env.js'

// Topup wallet command
export const topup = createCommand('wallet.topup')
  .alias('wt')
  .description('Topup your wallet with minted coins from the faucet')
  .addArgument(createArgument('[motos]', 'Amount of topup motos').default(10000).argParser(toInt))
  .action(walletTopup)

// Topup wallet action
async function walletTopup(motos: number) {
  log(bold('Topping up wallet...'))
  log()

  const cwd = process.cwd()
  const dir = join(cwd, '.aldea')
  
  await env.loadWallet(dir)

  const addr = await env.wallet.getNextAddress()
  const params = { amount: motos, address: addr.toString() }
  const res = await env.aldea.api.post('mint', { json: params }).json<OutputResponse>()
  const output = await env.aldea.loadOutput(res.id)
  await env.wallet.addOutput(output)

  ok(`Minted ${motos} motos`)
  ok('Coin added to wallet')
  log()
}

// Parses the arg as an integer
function toInt(arg: string) {
  const n = parseInt(arg)
  if (isNaN(n)) throw new InvalidArgumentError('not a number')
  return n
}
