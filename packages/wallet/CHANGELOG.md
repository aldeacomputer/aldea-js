# @aldea/wallet-lib

## 0.2.3

### Patch Changes

- @aldea/sdk@0.3.2

## 0.2.2

### Patch Changes

- @aldea/sdk@0.3.1

## 0.2.1

### Patch Changes

- @aldea/sdk@0.3.0

## 0.2.0

### Minor Changes

- e5e0b44: Improvements to TxBuilder API in SDK and Wallet lib.

  - `TxBuilder#push()` accepts custom build step functions
  - TxBuilder accepts new options:
    - `extend` - extend from previous transaction
    - `updateSigs` - update sigs in extended transaction
    - `onBuild` and `afterBuild` - hooks to mutate transaction as it is built

### Patch Changes

- Updated dependencies [e5e0b44]
  - @aldea/sdk@0.2.0

## 0.1.5

### Patch Changes

- @aldea/sdk@0.1.5

## 0.1.4

### Patch Changes

- @aldea/sdk@0.1.4
