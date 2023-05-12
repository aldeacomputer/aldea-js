# Aldea Mocknet

![Version](https://img.shields.io/npm/v/@aldea/mocknet?style=flat-square)
![License](https://img.shields.io/npm/l/@aldea/mocknet?style=flat-square)

> A mocked blockchain environment for building on the Aldea Computer

No blocks, no consensus, just a full-featured virtual machine for validating and executing transactions and an API for fetching state from the mocked environment.

## Usage

Projects created using the [Aldea Starter Kit](https://github.com/aldeacomputer/aldea-js/tree/main/packages/create-aldea) by default have the mocknet installed by default. You can run the mocknet within your starter kit project by using the command:

```shell
# using npm
npm run mocknet

# or using yarn
yarn mocknet
```

Alternatively, Docker users can start the mocknet in a container.

```shell
docker run -it -p '4000:4000' aldeacomputer/mocknet
```

Once the mocknet is running locally, hook the SDK up to use the mock environment.

```ts
import { Aldea } from '@aldea/sdk'

// Create an instance connecting to the mock node
const aldea = new Aldea('http://localhost:4000')
```

## License

Aldea is open source and released under the [Apache-2 License](https://github.com/aldeacomputer/aldea-js/blob/main/packages/mocknet/LICENSE).

© Copyright 2023 Run Computer Company, inc.
