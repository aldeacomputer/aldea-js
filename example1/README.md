# Compiler Example 1

This is a quick and dirty example showing how to use the compiler.

This module bundles with its own low-fi Vm - more as an example for Miguels Vm to follow re naming conventions etc.

## Usage

```shell
# Build the compiler
cd ALDEA_ZERO_PATH/compiler
yarn install
yarn tsc

cd ALDEA_ZERO_PATH/example1
yarn install
yarn aldea c src/person.ts -o build/person.wasm
node index
```

Obviously look at the code in `index.ts` and `src/person.ts` to figure out what's going on.
From this, it should be pretty simple to build a simple playing card NFT.
