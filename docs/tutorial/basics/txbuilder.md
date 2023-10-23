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
  scripts/tx.js: |
    import { env } from '@aldea/cli'

    await env.loadWallet()
    const address = await env.wallet.getNextAddress()

    const tx = await env.wallet.createFundedTx(txb => {
      // your txbuilder code here
    })

    const res = await env.wallet.commitTx(tx)

    console.log('txid', res.id)
    console.log('potion', res.outputs[2])
solution:
  scripts/tx.js: |
    import { env } from '@aldea/cli'

    await env.loadWallet()
    const address = await env.wallet.getNextAddress()

    const tx = await env.wallet.createFundedTx(txb => {
      const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
      const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])  // Polished Pine
      const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])   // Rose Quartz Pink
      const p3Ref = txb.call(p1Ref, 'mix', [p2Ref])
      txb.lock(p3Ref, address)
    })

    const res = await env.wallet.commitTx(tx)

    console.log('txid', res.id)
    console.log('potion', res.outputs[2])
open: 'scripts/tx.js'
---

# Building transactions

Up until now, the lessons have put you firmly the realm of the Jig Developer. We have been thinking about code, and writing code, that lives and runs *inside* the Aldea Computer. But, to *use* on-chain code requires us to think a little differently.

It's time to shift gears and enter the realm of the App Developer. Real-world apps and services exist *outside* of the blockchain, written witha avriety of languages, hosted on traditional servers, with real-world users and customers. In this sense, an app can be seen as an *interface* to the blockchain - the place where the real world meets the blockchain world.

The only way to interact with, and change the state on the Aldea Computer is through creating transactions. A transaction is a list of instructions that can import and load on-chain code, as well as call methods and functions. A transaction results in *outputs* - either new instances of Jigs or existing Jigs that have been updated.

## TxBuilder API

:::info Aldea SDK
In these examples we'll use the official Aldea JavaScript SDK. Similar tooling is being built for Rust and Elixir developers and in future we expect Aldea tooling becoming available for many languages.
:::

The `TxBuilder` API ([documentation here](/api/sdk/classes/TxBuilder-1.md)) is part of our SDK. It uses the builder pattern to construct a new transaction, instruction by instruction.

```ts
env.wallet.createFundedTx(txb => {
  // ...
})
```

The `Wallet#createFundedTx()` wraps around the `TxBuilder` API and will automatically add instructions to fund the transaction with the correct amount of coins from the CLI wallet. The method accepts a callback that recieves a `TxBuilder` instance. Every method we call on `txb` appends a new instruction to the transaction.

For example, the following code adds an `IMPORT` instruction that imports a package by it's ID.

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f') // [!code ++]
})
```

Each `TxBuilder` method returns an `InstructionRef`, which is a reference to that instruction. This is useful as subsequent instructions often refer to a previous instruction.

For example, the two new lines in this example each add a `NEW` instruction, the references the package imported from the first instruction.

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
  const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])  // [!code ++]
  const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])   // [!code ++]
})
```

You can probably guess that each of these `NEW` instructions create a new instance of a `Potion` Jig with the given arguments.

This next line adds a `CALL` instruction to the transaction. The instruction is to call the `mix` method on the first referenced Jig, passing the second referenced Jig as an argument.

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
  const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])
  const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])
  const p3Ref = txb.call(p1Ref, 'mix', [p2Ref]) // [!code ++]
})
```

You'll hopefully recall that the `mix()` method consumes the two input potions and returns a new instance of `Potion`. We have one more instruction to add:

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
  const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])
  const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])
  const p3Ref = txb.call(p1Ref, 'mix', [p2Ref])
  txb.lock(p3Ref, address) // [!code ++]
})
```

This final line adds a `LOCK` instruction, which locks the referenced Jig to the given address. It is unnecessary to lock the first two `Potion` instances as the mix method consumes and freezes them (`FROZEN` is a lock type).

::: info Locking all Jigs
In every transaction, all outputs &mdash; that is all Jigs either created or updated &mdash; must end the transaction locked to one of Aldea's primary lock types. If any outputs are left unlocked, then the transaction is invalid.
:::

## Commit the transaction

Add all the `TxBuilder` code to the placeholder in `scripts/tx.js` (or click the blue "Solve" button below). We can now use Node.js to run the script which will both build and commit the transaction to the Aldea Computer.

```sh
node scripts/tx
```

The script will respond with the transaction ID and the output ID of the mixed `Potion` instance. You can copy the values and search for them on [the Aldea Explorer](https://explorer.aldea.computer).

## What next?

Congratulations! You have started building on Aldea. You have created and deployed code on chain, and created a transaction that interacts with your code.

These few lessons are just the beginning - to introduce you to the basic programming model of Aldea. Hopefully it all feels very familiar, even if you have no previous blockchain experience.

We're working on further lessons that will extend your knowledge into more intermediate and advanced concepts. In the mean time, to learn more please ready our [learning resources](/learn/about-aldea) and [API documentation](/api/sdk/modules).