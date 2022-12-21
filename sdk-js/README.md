# Aldea SDK (JavaScript)

Aldea is a new layer 1 blockchain that offers developers of decentralized apps, games, and services an unparalleled experience on a platform designed for global scale.

The Aldea JavaScript SDK provides utility classes and functions for working with Aldea data types, creating and managing keys, building and signing transactions, and interfacing with an Aldea node.

**Warning**: Aldea is an early development. We are interating heavily on the design and function of the blockchain and expect frequent breaking changes. This software is not ready for general use.

## Installation

The Aldea SDK is published to the NPM registry. Install the SDK into your project with `npm` or your preferred alternative NPM client:

```shell
npm install @aldea/sdk-js
```

## Keys and addresses

Aldea uses BLAKE3-flavoured Ed25519 cryptography. Keys and addresses can be generated using the SDK:

```ts
import { KeyPair, Address } from '@aldea/sdk-js'

const keys = KeyPair.fromRandom()
const address = Address.fromPubKey(keys.pubKey)

console.log(keys.privKey.toHex())
console.log(keys.pubKey.toHex())
console.log(address.toString())
```

## Connecting to a node

Connect to your own or a public node to interface with the Aldea Computer.

```ts
import { Aldea } from '@aldea/sdk-js'

const aldea = new Aldea('node.aldea.computer', undefined, 'https')

// Examples
const tx = await aldea.getTx(txid)
const output = await aldea.getOutput(outputId)
```

## Building transactions

Once you have a connection to a noce, you can use the `Aldea` instance to build new transactions.

```ts
const tx = await aldea.createTx(tx => {
  const coin = tx.load(coinOutputId)
  const token = tx.load(jigOutputId)

  tx.call(token, 'send', [1000, recipient])
  tx.send(coin, 'send', [500, myNewAddress])
  tx.fund(coin)
  tx.sign(keys.privKey)
})

const txRes = await aldea.commitTx(tx)
```

