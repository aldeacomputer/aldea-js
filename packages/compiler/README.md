#  Aldea Compiler

![Version](https://img.shields.io/npm/v/@aldea/compiler?style=flat-square)
![License](https://img.shields.io/npm/l/@aldea/compiler?style=flat-square)

> Compiles AssemblyScript code into Aldea-flavoured WASM packages.

The Aldea Compiler wraps around and enhances the functionality of the AssemblyScript compiler and generates WASM binaries that are compatible with and safe to execute in the Aldea Computer:

- Validates that the code is safe to be executed in the Aldea Computer.
- Applies various "transforms" and glue code to the source to ensure that compiled packages can safely interoperate.
- Compiles and outputs an optimized WASM binary.
- Generates and outputs the package ABI document.
- Optionally parses and generates source code documentation.

## Usage

There are currently two ways to interact with the compiler:

### 1. Compiler CLI

The CLI can be a useful way to quickly debug code and inspect the generated ABI or docs.

```shell
aldea compile <INPUT_FILE> -o <OUTPUT_PATH>
```

### 2. Programatically

If you are integrating the compiler into other tools, it can be invoked programatically.

```ts
import { compile } from '@aldea/compiler'

const { output, stats, stdout } = await compile(srcCode)
const { abi, docs, wasm, wat } = output
```

## License

Aldea is open source and released under the [Apache-2 License](https://github.com/aldeacomputer/aldea-js/blob/main/packages/compiler/LICENSE).

© Copyright 2023 Run Computer Company, inc.
