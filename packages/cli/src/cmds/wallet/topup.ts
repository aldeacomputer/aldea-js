import { Command, Argument, InvalidArgumentError } from 'commander'

export const topup =
  new Command('wallet.topup')
    .alias('wt')
    .description('Topup your wallet with minted coins from the faucet')
    .addArgument(new Argument('[motos]', 'Amount of topup motos').default(1000).argParser(toInt))
    .action(walletTopup)

function walletTopup() {
  console.log('topping up')
}

// Parses the arg as an integer
function toInt(arg: string) {
  const n = parseInt(arg)
  if (isNaN(n)) throw new InvalidArgumentError('not a number')
  return n
}
