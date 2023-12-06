# @aldea/core

## 0.7.2

### Patch Changes

- 50b769f: Added support for native aldea BigInt

## 0.7.0

### Minor Changes

- 2cec12c: Change to design of ABI structure and Jig model. Including:

  - static methods removed
  - EXEC removed. EXECFUNC becomes EXEC
  - access modifiers on fields now ignores (public by definition)
  - access modifiers on methods refined
  - plain objects are first class code items like classes and functions
  - protected and private constructors are enabled

## 0.6.0

### Patch Changes

- e9d7a06: Minor change to improve consistency with ABI de/serialization across implementations.
- 1d17fc5: Fixes minor issue with tx sighash algo.

## 0.5.0

### Patch Changes

- 62ac390: Wrap structuredClone so it falls back to json stringify/parse in node < 18.

## 0.4.0

### Minor Changes

- fe17cd7: New Shared KeyPairs

### Patch Changes

- 06dddbd: New compiler sourge graph to support multi-file packages and magic dependency imports

## 0.3.9

### Patch Changes

- 3a8cc57: Fixes to make interface return type work.

## 0.3.5

### Patch Changes

- 7277a72: Fix dependency chain serialization bug
- 7514369: Fixed BCS bug with naming of AssemblyScript uint64arrays and int64arrays

## 0.3.4

### Patch Changes

- Forced version bump to take advantage of improved release script

## 0.3.2

### Patch Changes

- 0bb0a09: Use correct locktype enum names

## 0.3.1

## 0.3.0

### Minor Changes

- 520b723: - Updated sighash algorith to include SIGN & SIGN to opcodes and pubkeys.
  - Implemented a Tx.verify() function.

## 0.2.0

## 0.1.5

### Patch Changes

- 528d5d0: Fixed uleb encoding and decoding

## 0.1.4
