# Aldea JavaScript SDK

![Version](https://img.shields.io/npm/v/@aldea/sdk-js?style=flat-square)
![License](https://img.shields.io/npm/l/@aldea/sdk-js?style=flat-square)

> A Swiss Army knife for Aldea app developers.

The Aldea JavaScript SDK provides utility classes and functions for working with Aldea data types, creating and managing keys, building and signing transactions, and interfacing with an Aldea node.

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

const aldea = new Aldea('https://node.aldea.computer')

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

## License

Aldea is open source and released under the [Apache-2 License](https://github.com/aldeacomputer/aldea-js/blob/main/packages/sdk-js/LICENSE).

© Copyright 2023 Run Computer Company, inc.
