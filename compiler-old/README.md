# Alder Compiler

## Status

**Summary**: Early days, expect nothing to work!

Todo:

- [x] Compiles source with a single class and basic types (integers, strings and u8 arrays)
- [x] Correctly serializes and deserializes using CBOR
- [x] Exports constructor, static, instance methods
- [x] Exports parse and serialize functions
- [ ] Supports external jigs as arguments in functions
- [ ] Supports external jigs as class properties
- [ ] Supports different class types (arbitrary class, complex class, jig class, + each of those as external)
- [ ] Supports complex types (Maps, Sets, other typed arrays, other things)
- [ ] Some validation on source (check if multiple classes, reserved names as functions)
- [ ] ... more... much more!

## How to use the compiler?

If you clone this mono-repo and build the compiler, you can install it in your own npm project on the same machine.

```shell
# Clone and build compiler
$ git clone git@github.com:runonbitcoin/aldea-zero.git
$ cd aldea-zero/compiler
$ yarn install && yarn tsc

# Install and use compiler in own package
$ cd MY_OWN_PROJECT
$ yarn install file://PATH_TO_ALDEA_ZERO/compiler
$ yarn aldea compile MY_SOURCE_FILE -o OUTPUT_WASM_FILE
```

Within your own package, make sure you also have `assemblyscript` installed, and setup a `tsconfig.json` file in the root.

```json
{
  "extends": "assemblyscript/std/assembly.json",
  "include": [
    "./**/*.ts"
  ]
}
```

## How to use compiled modules in the Vm?

TBC
