# Lib

This directory contains forks of third-party dependencies used by the other projects.

## Commands

Pull the latest `wasmer` dependency used in `rust-bench`

```bash
# From the root directory
git subtree pull --prefix lib/wasmer https://github.com/wasmerio/wasmer master --squash
```

Pull the latest `assemblyscript` dependency used in `compiler`

```bash
# From the root directory
git subtree pull --prefix lib/wasmer https://github.com/assemblyscript/assemblyscript master --squash
```
