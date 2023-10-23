---
sidebar: false
files:
  aldea/potion.ts: |
    export class Potion extends Jig {
      red: u8;
      green: u8;
      blue: u8;

      constructor(r: u8, g: u8, b: u8) {
        super()
        this.red = r
        this.green = g
        this.blue = b
      }

      mix(other: Potion): Potion {
        const red = this.red + other.red
        const green = this.green + other.green
        const blue = this.blue + other.blue
        this.freeze()
        other.freeze()
        return new Potion(red, green, blue)
      }

      protected freeze(): void {
        this.$lock.freeze()
      }
    }
    
open: 'aldea/potion.ts'
---

# Discover the CLI

Now that the code is ready, it's time to get familiar with the Aldea CLI and deploy your `Potion` class onto the Aldea Computer.

The terminal panel in the bottom right segment of this window is a fully featured interactive shell session. The setup is identical to having installed our [starter kit](https://github.com/aldeacomputer/aldea-js/tree/main/packages/create-aldea) on your own machine, so we'll use the Aldea CLI and SDK in the same way as if you were developing locally.

## The CLI wallet

Blockchains are economic systems, and adding transactions to a blockchain usually involves paying a small fee to block producers. The Aldea Computer is no exception. Therefore, we need to create a wallet and aquire a small amount of Aldea Coins to fund our transactions.

The Aldea CLI makes this easy. Copy and paste the following command into the terminal to create a wallet in your project:

```sh
aldea wallet.init
```

This command generates a hidden `.aldea` directory in your project containing keys and wallet data.

Next up, we need to fund the wallet with some coins. Again, the CLI has you covered. Copy and paste the following command into the terminal to fund your wallet with `0.00005000` Aldea Coins.

```sh
aldea wallet.topup -m 5000
```

The command response seems to suggest we just minted 5000 motos out of thin air. In fact, because we're developing on "devnet", that pretty much *is* what just happened.

:::info devnet
There are several Aldea networks that developers may encounter. This tutorial uses the "devnet" network, which offers a convinient feature that effectively allows you to mint fresh Aldea Coins out of thin air. Don't get too excited, devnet coins have no real world value.

The Aldea testnet and mainnet will not offer this feature, so it will be necessary to source Aldea Coins by either producing blocks and being paid Aldea Coins, or aquiring coins from an exchange.
:::

Now we can check the balance of our wallet with the following command:

```sh
aldea wallet.balance
```

Transactions on Aldea are cheap, so these coins should keep us going for a while.

## Deploying code

Now we have some coins it's time to deploy that `Potion` class. Once again, the CLI has a couple of really helpful commands for us.

Before deploying any code, it can be useful to try and compile the code locally, just so we know it definitely will compile, or if it wont we can find out what we need to fix to get it compiling. Try the following:

```sh
aldea compile -d potion.ts
```

The `-d` option means "dry run". If compilation is successful, the CLI responds with a success message and the package ID. If there are any compilation errors, these will be printed to the terminal in a way where specific issues can be pinpointed.

If everything looks like it's compiling properly, then use the following command to deploy your first package:

```sh
aldea deploy potion.ts
```

Remember, every change to the Aldea Computer blockchain happens through a transaction. That's what just happened here &mdash; the CLI created a transaction that deployed a new package containing your `Potion` class, funded the transaction using a Coin from your wallet, and committed the transaction to the blockchain.

The deploy command responds with both a Transaction ID and Package ID. You can copy either of these values and search for them on [the Aldea Explorer](https://explorer.aldea.computer).

Congratulations, you just deployed your first package! 🎉

All that's left next is to use your on-chain code. When ready, proceed to the next lesson to learn about the SDK's `TxBuilder` API.
