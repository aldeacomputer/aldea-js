# @aldea/sdk

## 0.7.2

### Patch Changes

- 2a9d63c: Improved validations to check field types and method signatures of interface implementations.
- Updated dependencies [50b769f]
  - @aldea/core@0.7.2

## 0.7.1

### Patch Changes

- New version to republish with right build

## 0.7.0

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

## 0.6.1

### Patch Changes

- ec8aeca: Using binary version of abi http api.

## 0.6.0

### Minor Changes

- 3852849: Update ky dependency.

### Patch Changes

- Updated dependencies [e9d7a06]
- Updated dependencies [1d17fc5]
  - @aldea/core@0.6.0

## 0.5.0

### Patch Changes

- 9a9db5c: Fixed bug where aldea.getPackageSrc returned files in wrong data format.
- 65763fc: SDK api client caching is configurable. CLI defaults to caching off.
- Updated dependencies [62ac390]
  - @aldea/core@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [fe17cd7]
- Updated dependencies [06dddbd]
  - @aldea/core@0.4.0

## 0.3.9

### Patch Changes

- 3a8cc57: Fixes to make interface return type work.
- Updated dependencies [3a8cc57]
  - @aldea/core@0.3.9

## 0.3.5

### Patch Changes

- 7514369: Fixes issue where TxBuilder did not correctly determine Coin class from method return types.
- Updated dependencies [7277a72]
- Updated dependencies [7514369]
  - @aldea/core@0.3.5

## 0.3.4

### Patch Changes

- Forced version bump to take advantage of improved release script
- Updated dependencies
  - @aldea/core@0.3.4

## 0.3.2

### Patch Changes

- Updated dependencies [0bb0a09]
  - @aldea/core@0.3.2

## 0.3.1

### Patch Changes

- @aldea/core@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [520b723]
  - @aldea/core@0.3.0

## 0.2.0

### Minor Changes

- e5e0b44: Improvements to TxBuilder API in SDK and Wallet lib.

  - `TxBuilder#push()` accepts custom build step functions
  - TxBuilder accepts new options:
    - `extend` - extend from previous transaction
    - `updateSigs` - update sigs in extended transaction
    - `onBuild` and `afterBuild` - hooks to mutate transaction as it is built

### Patch Changes

- @aldea/core@0.2.0

## 0.1.5

### Patch Changes

- Updated dependencies [528d5d0]
  - @aldea/core@0.1.5

## 0.1.4

### Patch Changes

- @aldea/core@0.1.4
