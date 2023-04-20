import { Command } from 'commander'

export const balance =
  new Command('wallet.balance')
    .alias('wb')
    .description('Show your wallet balance')
    .action(walletBalance)

function walletBalance() {
  console.log('showing balance')
}

