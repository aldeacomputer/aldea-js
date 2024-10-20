# @aldea/vm

## 0.8.0

### Patch Changes

- Updated dependencies [9ff1ecb]
  - @aldea/compiler@0.7.0

## 0.7.3

### Patch Changes

- e19f45d: Fixed bug lifting and lowering inbetween packages
- Updated dependencies [7ab2e7a]
  - @aldea/compiler@0.6.1

## 0.7.2

### Patch Changes

- 50b769f: Added inputs to exec-tx response
- 50b769f: Added support for native aldea BigInt
- Updated dependencies [aa2e656]
- Updated dependencies [50b769f]
- Updated dependencies [2a9d63c]
- Updated dependencies [50b769f]
  - @aldea/compiler@0.6.0
  - @aldea/core@0.7.2

## 0.7.0

### Minor Changes

- 8ef9466: Major rewrite of VM. Using new ABI format. Using new idx format

### Patch Changes

- Updated dependencies [2cec12c]
  - @aldea/compiler@0.5.0
  - @aldea/core@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [e9d7a06]
- Updated dependencies [1d17fc5]
  - @aldea/core@0.6.0
  - @aldea/compiler@0.4.1

## 0.5.0

### Minor Changes

- 4c66791: Sending parameters as little endian instead of big endian.

### Patch Changes

- b681d96: Fixed bug with booleans
  Checking coin locks before funding.
- Updated dependencies [4c66791]
- Updated dependencies [74ab0de]
- Updated dependencies [37a9715]
- Updated dependencies [62ac390]
- Updated dependencies [85431b6]
  - @aldea/compiler@0.4.0
  - @aldea/core@0.5.0

## 0.4.0

### Minor Changes

- 06dddbd: Supports dynamic dependency injection at package compile time.

### Patch Changes

- Updated dependencies [fe17cd7]
- Updated dependencies [06dddbd]
  - @aldea/core@0.4.0
  - @aldea/compiler@0.3.0

## 0.3.9

### Patch Changes

- Updated dependencies [3a8cc57]
  - @aldea/core@0.3.9
  - @aldea/compiler@0.2.8

## 0.3.7

### Patch Changes

- 19064e8: Fix lower jigs with right class ptr.
- 8013359: Fix issues lowering and lifting interfaces.

## 0.3.6

### Patch Changes

- 89af1e7: Fix typed lifting and lowering behavior for typed arrays.

## 0.3.5

### Patch Changes

- 7277a72: Fix dependency chain serialization bug
- Updated dependencies [7277a72]
- Updated dependencies [7514369]
  - @aldea/core@0.3.5
  - @aldea/compiler@0.2.7

## 0.3.4

### Patch Changes

- Forced version bump to take advantage of improved release script
- Updated dependencies
  - @aldea/compiler@0.2.6
  - @aldea/core@0.3.4

## 0.3.3

### Patch Changes

- 3ab9317: Fixes issue where arraybuffers lifted from memory with wrong type

## 0.3.2

### Patch Changes

- Updated dependencies [0bb0a09]
  - @aldea/core@0.3.2
  - @aldea/compiler@0.2.5

## 0.3.1

### Patch Changes

- Fix issue where not all files getting published to npm
  - @aldea/core@0.3.1
  - @aldea/compiler@0.2.4

## 0.3.0

### Patch Changes

- Updated dependencies [520b723]
  - @aldea/core@0.3.0
  - @aldea/compiler@0.2.3

## 0.2.0

### Patch Changes

- e5e0b44: Fixed bug where FUND instruction not appearing in statement results.
  - @aldea/core@0.2.0
  - @aldea/compiler@0.2.2

## 0.1.5

### Patch Changes

- Updated dependencies [528d5d0]
  - @aldea/core@0.1.5
  - @aldea/compiler@0.2.1

## 0.1.4

### Patch Changes

- Updated dependencies
  - @aldea/compiler@0.2.0
  - @aldea/core@0.1.4
