# @aldea/compiler

## 0.5.0

### Minor Changes

- 2cec12c: Change to design of ABI structure and Jig model. Including:

  - static methods removed
  - EXEC removed. EXECFUNC becomes EXEC
  - access modifiers on fields now ignores (public by definition)
  - access modifiers on methods refined
  - plain objects are first class code items like classes and functions
  - protected and private constructors are enabled

### Patch Changes

- Updated dependencies [2cec12c]
  - @aldea/core@0.7.0

## 0.4.1

### Patch Changes

- Updated dependencies [e9d7a06]
- Updated dependencies [1d17fc5]
  - @aldea/core@0.6.0

## 0.4.0

### Minor Changes

- 4c66791: Sending parameters as little endian instead of big endian.
- 85431b6: Compiler provides standalone compileDocs function.

### Patch Changes

- 74ab0de: Fixed bug where imported classes in some conditions also appeared in ABI as plain objects.
- 37a9715: Update assemblyscript dependency to fix compiler mismatch error.
- Updated dependencies [62ac390]
  - @aldea/core@0.5.0

## 0.3.0

### Minor Changes

- 06dddbd: New compiler sourge graph to support multi-file packages and magic dependency imports

### Patch Changes

- Updated dependencies [fe17cd7]
- Updated dependencies [06dddbd]
  - @aldea/core@0.4.0

## 0.2.8

### Patch Changes

- Updated dependencies [3a8cc57]
  - @aldea/core@0.3.9

## 0.2.7

### Patch Changes

- Updated dependencies [7277a72]
- Updated dependencies [7514369]
  - @aldea/core@0.3.5

## 0.2.6

### Patch Changes

- Forced version bump to take advantage of improved release script
- Updated dependencies
  - @aldea/core@0.3.4

## 0.2.5

### Patch Changes

- Updated dependencies [0bb0a09]
  - @aldea/core@0.3.2

## 0.2.4

### Patch Changes

- @aldea/core@0.3.1

## 0.2.3

### Patch Changes

- Updated dependencies [520b723]
  - @aldea/core@0.3.0

## 0.2.2

### Patch Changes

- @aldea/core@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [528d5d0]
  - @aldea/core@0.1.5

## 0.2.0

### Minor Changes

- Removed cli from compiler package and added compiler command to standalone cli package

### Patch Changes

- @aldea/core@0.1.4
