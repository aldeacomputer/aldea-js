# Aldea Core

![Version](https://img.shields.io/npm/v/@aldea/core?style=flat-square)
![License](https://img.shields.io/npm/l/@aldea/core?style=flat-square)

> Core Aldea data structuresand cryptographic functions.

TODO.

## Installation

Aldea Core is published to the NPM registry. Install the package in your project with `npm` or an alternative NPM client:

```shell
npm install @aldea/core
```

## Keys and addresses

Aldea uses BLAKE3-flavoured Ed25519 cryptography. Keys and addresses can be generated:

```ts
import { KeyPair, Address } from '@aldea/core'

const keys = KeyPair.fromRandom()
const address = Address.fromPubKey(keys.pubKey)

console.log(keys.privKey.toHex())
console.log(keys.pubKey.toHex())
console.log(address.toString())
```

## License

Aldea is open source and released under the [Apache-2 License](https://github.com/aldeacomputer/aldea-js/blob/main/packages/core/LICENSE).

© Copyright 2023 Run Computer Company, inc.
