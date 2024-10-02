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

Now that the code is ready, let's familiarize ourselves with the Aldea CLI and deploy the `Potion` class onto the Aldea Computer.

The terminal panel in the bottom right segment of this window is an interactive shell session. The setup is identical to having installed our [starter kit](https://github.com/aldeacomputer/aldea-js/tree/main/packages/create-aldea) on your own machine, We'll use the Aldea CLI and SDK in the same way as if you were developing locally.

## The CLI wallet

Blockchains are economic systems, and adding transactions to a blockchain usually requires paying a small fee to block producers. The Aldea Computer is no exception. Therefore, we need to create a wallet and acquire a small amount of Aldea Coins to fund our transactions.

The Aldea CLI makes this easy. Copy and paste the following command into the terminal to create a wallet in your project:

```sh
aldea wallet.init
```

This command generates a hidden `.aldea` directory in your project that contains keys and wallet data.

Next, we need to fund the wallet with some coins. Copy and paste the following command into the terminal to fund your wallet with `0.00005000` Aldea Coins.

```sh
aldea wallet.topup -m 5000
```

The command response suggests that we just minted 5000 motos out of thin air. In fact, because we're developing on the "devnet", that essentially *is* what just happened.

:::info devnet
There are several Aldea networks that developers may encounter. This tutorial uses the "devnet" network, which allows you to mint Aldea Coins out of thin air for testing purposes. However, don;t get too excited &mdash; devnet coins have no real-world value.

The Aldea testnet and mainnet do not offer this feature, so you will need to source Aldea Coins by either producing blocks and being paid Aldea Coins or acquiring coins from an exchange.
:::

Now we can check the balance of our wallet with the following command:

```sh
aldea wallet.balance
```

Transactions on Aldea are cheap, so these coins should keep us going for a while.

## Deploying code

Now that we have some coins, it's time to deploy the `Potion` class. Once again, the CLI has us covered with some helpful commands.

Before deploying any code, it can be useful to try compiling the code locally to ensure it compiles successfully. This way, if there are any compilation errors, we can identify and fix them. Try the following:

```sh
aldea compile -d potion.ts
```

The `-d` option means "dry run". If compilation is successful, the CLI responds with a success message and the package ID. If there are any compilation errors, they will be printed to the terminal, allowing us to pinpoint specific issues.

If everything compiles properly, use the following command to deploy your first package:

```sh
aldea deploy potion.ts
```

Remember, every change to the Aldea Computer blockchain happens through a transaction. In this case, the CLI created a transaction that deployed a new package containing your `Potion` class, funded the transaction using a coin from your wallet, and committed the transaction to the blockchain.

The deploy command responds with both a Transaction ID and Package ID. You can copy either of these values and search for them on [the Aldea Explorer](https://explorer.aldeacomputer.com).

Congratulations on deploying your first package! 🎉

The next step is to use your on-chain code. When you're ready, proceed to the next lesson to learn about the SDK's `TxBuilder` API.
