# rust-interface

The current Rust node calls this external program to compile packages.

It's just a thin wrapper around the compiler library and lighter weight than the CLI.

```
node dist/index.js <input-file> <output-file>
```

The output file contains both the WASM and the ABI serialized together.

This interface will be removed in the future when we directly call the compiler from Rust.
