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

Until now, the lessons have focused on the role of the Jig Developer, involving code that operates *inside* the Aldea Computer. However, using on-chain code requires a different approach.

It's time to transition to the role of an App Developer. Real-world applications and services exist outside the blockchain, written in various languages, hosted on traditional servers, and catering to real-world users and customers. In this context, an app serves as an interface between the real world and the blockchain.

To interact with and modify the state of the Aldea Computer, we need to create transactions. A transaction is a set of instructions that can import and load on-chain code, as well as invoke methods and functions. Executing a transaction produces *outputs*, which can be either new instances of Jigs or updates to existing Jigs.

## TxBuilder API

:::info Aldea SDK
In these examples, we'll use the official Aldea JavaScript SDK. Similar tooling is being developed for Rust and Elixir, and we anticipate that Aldea tooling will be available for many languages in the future.
:::

The `TxBuilder` API (see [documentation here](/api/sdk/classes/TxBuilder-1.md)) is part of our SDK. It utilizes the builder pattern to construct a new transaction, step by step.

```ts
env.wallet.createFundedTx(txb => {
  // ...
})
```

The `Wallet#createFundedTx()` function wraps around the `TxBuilder` API and automatically adds instructions to fund the transaction with the correct amount of coins from the CLI wallet. This function takes a callback that receives a `TxBuilder` instance. Each method we invoke on `txb` appends a new instruction to the transaction.

For example, the following code adds an `IMPORT` instruction to import a package by its ID.

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f') // [!code ++]
})
```

Every `TxBuilder` method returns an `InstructionRef`, which is a reference to that particular instruction. This is useful because subsequent instructions often refer to previous ones.

In the next example, each of the two new lines adds a `NEW` instruction that references the package imported in the first instruction.

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
  const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])  // [!code ++]
  const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])   // [!code ++]
})
```

You can probably guess that each of the `NEW` instructions creates a new instance of a `Potion` Jig with the specified arguments.

The next line adds a `CALL` instruction to the transaction. This instruction calls the `mix` method on the first referenced Jig, passing the second referenced Jig as an argument.

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
  const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])
  const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])
  const p3Ref = txb.call(p1Ref, 'mix', [p2Ref]) // [!code ++]
})
```

As you may recall, the `mix()` method consumes the two input potions and returns a new instance of `Potion`. We have one more instruction to add:

```ts
env.wallet.createFundedTx(txb => {
  const pkgRef = txb.import('476aae48bf2bc5adce5c31db866e39d1a76a994d8b827867758b3bf4adafd73f')
  const p1Ref = txb.new(pkgRef, 'Potion', [101, 161, 137])
  const p2Ref = txb.new(pkgRef, 'Potion', [185, 75, 152])
  const p3Ref = txb.call(p1Ref, 'mix', [p2Ref])
  txb.lock(p3Ref, address) // [!code ++]
})
```

The final line adds a `LOCK` instruction, which locks the referenced Jig to the specified address. It is unnecessary to lock the first two `Potion` instances because the mix method consumes and freezes them (`FROZEN` is a lock type).

::: info Locking all Jigs
In every transaction, all outputs &mdash; that is, all created or updated Jigs &mdash; must end the transaction locked to one of Aldea's primary lock types. If any outputs are left unlocked, the transaction is considered invalid.
:::

## Commit the transaction

Insert all the `TxBuilder` code into the placeholder in `scripts/tx.js` (or click the blue "Solve" button below). We can now use Node.js to execute the script, which will build and commit the transaction to the Aldea Computer.

```sh
node scripts/tx
```

The script will provide the transaction ID and the output ID of the mixed `Potion` instance. You can copy these values and search for them on [the Aldea Explorer](https://explorer.aldea.computer).

## What's next?

Congratulations! You have begun building on the Aldea Computer. You have created and deployed code on the blockchain and created a transaction that interacts with your code.

These lessons are just the beginning, introducing the basic programming model of Aldea. Even if you have no prior experience with blockchain, hopefully Aldea's programming model feels natural, or even familiar.

We are developing additional lessons that will expand your knowledge with intermediate and advanced concepts. In the meantime, you can learn more by exploring our [learning resources](/learn/about-aldea) and [API documentation](/api/sdk/modules).