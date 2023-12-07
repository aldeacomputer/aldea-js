# Development quickstart

Starting your development journey with Aldea doesn't have to feel like rocket science. Our programming model and developer tooling are designed to help you forget about the complexities of blockchain and focus on doing what you do best, crafting excellent great products.

Our [interactive tutorials](/tutorial/basics/introduction) are the perfect launch pad. They provide a full Aldea developer environment within your web browser. Once you're ready, you can install the Aldea SDK and Command Line Interface (CLI) locally to power up your development.

## Local dev environment

The Aldea Starter kit is the first step in building on Aldea locally. It incorporates all necessary Aldea tools into an NPM initializer, making your first steps straightforward.

Initiate a fresh Aldea project into a directory of your chosing (for instance, `my-project`):

```shell
npm create aldea@latest my-project
```

Once the initializer has created your project, navigate to the directory and install the dependencies:

```shell
cd my-project
npm install
```

With the dependencies ready, use the CLI to create a development wallet and top it up with a few coins.

To create a new wallet:

```shell
npx aldea wallet.init
```

Next, direct the wallet to mint 5000 motos for code deployment. This amazing "mint free money" feature is sadly only available on our devnet and mocknet networks.

```shell
npx aldea wallet.topup --mint 5000
```

Lastly, check the balance of your wallet by invoking:

```shell
npm aldea wallet.balance
```

## CLI commands

The Aldea CLI is an essential part of every Aldea developer's toolbelt. The following commands will help you create on-chain code, install and manage dependencies, and ultimately deploy your code on the Aldea Computer.

### `wallet.init`

Initializes a development wallet for your project. Used to fund transactions for deploying code.

```txt
Usage: aldea wallet.init|wi [options]

Create a new wallet in the current directory

Options:
  -f, --force        Force create (default: false)
  -t, --type <type>  Wallet type (choices: "hd", "sk", default: "sk")
  -h, --help         display help for command
```

### `wallet.balance`

Used to check the current balance of your development wallet.

```txt
Usage: aldea wallet.balance|wb [options]

Show your wallet balance

Options:
  -h, --help  display help for command
```

### `wallet.topup`

Allows you to top up your development wallet.

```txt
Usage: aldea wallet.topup|wt [options]

Topup your wallet with minted coins from the faucet

Options:
  -m, --mint [motos]  Amount of topup motos
  -h, --help          display help for command
```

### `deps.add`

Installs dependencies to your Aldea project by their package ID.

```txt
Usage: aldea deps.add|da [options] <pkg...>

Add dependency by package ID

Arguments:
  pkg         One or more package IDs to install

Options:
  -h, --help  display help for command
```

### `deps.get`

Scans the source code and installs all of the project's dependencies.

```txt
Usage: aldea deps.get|dg [options] [entry...]

Fetch all package dependencies

Arguments:
  entry       One or more entry files

Options:
  -h, --help  display help for command
```

### `deps.list`

Lists all the dependencies of your project.

```txt
Usage: aldea deps.list|dl [options] [entry...]

List all package dependencies

Arguments:
  entry       One or more entry files

Options:
  -h, --help  display help for command
```

### `deps.remove`

Removes specific dependencies from your project.

```txt
Usage: aldea deps.remove|dr [options] <pkg...>

Remove dependency by package ID

Arguments:
  pkg         One or more package IDs to remove

Options:
  -h, --help  display help for command
```

### `compile`

Compiles your code into an Aldea package. It's useful to compile locally using `--dry-run` to spot any problems before deploying.

```txt
Usage: aldea compile|c [options] [entry...]

Compile a code package

Arguments:
  entry                     One or more entry files

Options:
  -e, --entry [entry...]    List entry files (default: [])
  -n, --name [name]         Package name
  -o, --output [directory]  Output directory (default: "/Users/aaron/Dev/aldea/aldea-js/packages/cli/test/playground/aldea/build")
  --docs                    Create docs file (default: false)
  --wat                     Create .wat file (default: false)
  -d, --dry-run             Dry run only (default: false)
  -h, --help                display help for command
```

### `deploy`

Deploys your compiled code to the Aldea Computer.

```txt
Usage: aldea deploy|d [options] <source...>

Deploy a code package

Arguments:
  source      One or more source files to deploy

Options:
  -h, --help  display help for command
```

Remember, tools and platforms should simplify your tasks, not complicate them. If you've familiarised yourself with Aldea's programming model through our [interactive tutorial](/tutorial/basics/introduction), using the starter kit and CLI will be plain sailing. Happy coding!
