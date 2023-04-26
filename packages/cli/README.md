# Aldea CLI

![Version](https://img.shields.io/npm/v/@aldea/cli?style=flat-square)
![License](https://img.shields.io/npm/l/@aldea/cli?style=flat-square)

> A command-line utility belt for Aldea app developers.

The Aldea CLI provides all the tools needed for creating and deploying code to the Aldea Computer.

## Installation

The Aldea CLI is installed automatically in projects create with the [Aldea Starter Kit](https://github.com/aldeacomputer/aldea-js/tree/main/packages/create-aldea). Optionally, the CLI can be installed globally using `npm`.

```shell
npm install -g @aldea/cli
```

## Usage

```text
Usage: aldea <command> [options]

Options:
  -N --node <url>             Aldea node URL
  -V, --version               output the version number
  -h, --help                  display help for command

Commands:
  pkg.deploy|pd <source...>   Deploy a code package
  wallet.create|wc [options]  Create a new wallet in the current directory
  wallet.balance|wb           Show your wallet balance
  wallet.topup|wt [options]   Topup your wallet with minted coins from the faucet
  help [command]              display help for command
```

## License

Aldea is open source and released under the [Apache-2 License](https://github.com/aldeacomputer/aldea-js/blob/main/packages/cli/LICENSE).

© Copyright 2023 Run Computer Company, inc.
