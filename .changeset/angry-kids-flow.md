---
"@aldea/wallet-lib": minor
"@aldea/sdk": minor
---

Improvements to TxBuilder API in SDK and Wallet lib.

- `TxBuilder#push()` accepts custom build step functions
- TxBuilder accepts new options:
  - `extend` - extend from previous transaction
  - `updateSigs` - update sigs in extended transaction
  - `onBuild` and `afterBuild` - hooks to mutate transaction as it is built
