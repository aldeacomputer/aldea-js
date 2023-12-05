# Transactions

All changes to the Aldea Computer's state occur through transactions. Conceptually, a transaction exists as a list of instructions, executed sequentially when the transaction is processed.

If we interpret a transaction as a list of instructions and a block as a list of transactions, then a block transforms into a broader sequence of instructions whose orderly execution results in a deterministic set of outcomes.

## Instructions

An instruction is a precise unit of code the performs a specific task. The Aldea Computer can recognize and execute 11 different instructions. These instructions are capable of loading Jigs and packages of code, calling methods on Jigs or executing static code, deploying new packages, and adding signatures to the transaction.

Each instruction accepts a certain number of arguments and returns a result. Instructions can reference the outcome of previous instructions via an instruction reference, which is the index of the previous instruction. Consequently, a transaction's instruction list becomes a small but very capable computer program, articulated expressively using an Assembly-like syntax.

```ts
// Loads an output by its ID
LOAD 0xC301A62EE9319201189CF1CC0C9DA03E0CEF12BC47A589F3EED7E268E0E5A5E9
// Calls a method on jig passing the encoded arguments
// 0 is the instruction reference of the target jig
// 2 is the index of the public method according to the Jig's ABI
CALL 0 2 0x0568656C6C6F05776F726C64
```

### `IMPORT <PACKAGE_ID>`

Imports a package by its ID.

-	`PACKAGE_ID` - 32 byte package ID.

### `LOAD <OUTPUT_ID>`

Loads a Jig by its output ID.

- `OUTPUT_ID` - 32 byte output ID.

### `LOADBYORIGIN <ORIGIN_PTR>`

Loads a Jig by its origin.

- `ORIGIN_PTR` - 34 byte origin Pointer.

### `NEW <REF> <EXPORT_IDX> <ENCODED_ARGS>`

Instantiates a new Jig.

- `REF` - Instruction reference of a package.
- `EXPORT_IDX` - The index of the class exported from the package.
- `ENCODED_ARGS` - BCS-encoded arguments passed to the constructor.

### `CALL <REF> <METHOD_IDX> <ENCODED_ARGS>`

Calls a method on a Jig.

- `REF` - Instruction reference of a Jig.
- `METHOD_IDX` - The index of the method in the class. Only public methods are indexed, and in the case of a class with inheritance, indexing begins at the oldest ancestor.
- `ENCODED_ARGS` - BCS-encoded arguments passed to the method.

### `EXEC <REF> <EXPORT_IDX> <ENCODED_ARGS>`

Calls a static function.

- `REF` - Instruction reference of a package.
- `EXPORT_IDX` - The index of the function exported from the package.
- `ENCODED_ARGS` - BCS-encoded arguments passed to the function.

### `FUND <REF>`

Funds the transaction with a coin Jig.

- `REF` - Instruction reference of the coin Jig.

### `LOCK <REF> <PUBKEY_HASH>`

Locks a Jig to an address.

- `REF` - Instruction reference of a Jig.
- `EXPORT_IDX` - The index of the function exported from the package.

### `DEPLOY <ENCODED_PKG>`

This instruction deploys a package on the Aldea Computer.

- `ENCODED_PKG` - The BCS-encoded package.

### `SIGN <SIG> <PUBKEY>`

Signs the entire transaction, inclusive of this and subsequent instructions.

- `SIG` - 64 byte signature.
- `PUBKEY` - 32 byte public key.

### `SIGNTO <SIG> <PUBKEY>`

Signs the transaction, up to and inclusive of this instruction.

- `SIG` - 64 byte signature.
- `PUBKEY` - 32 byte public key.

## Deploys

Deployment instructions on the Aldea Computer are the most cost-intensive instructions. Their compilation is a highly computationally demanding operation and nodes are required to store packages indefinitely.

## Signatures

To modify a Jig locked to an address, a transaction must include a signature from the corresponding key. The `SIGN` instruction signs the entire transaction, while the `SIGNTO` instruction signs all prior instructions.

The signed message is a Blake-3 hash of the covered instructions. Signatures from other `SIGN` and `SIGNTO` instructions are omitted from the sighash message.

## Transaction Execution Result

On committing a transaction to the Aldea Computer, the node responds with a transaction execution result - a JSON document encapsulating the raw transaction, lists of output IDs of Jigs that were spent and read, a list of executed deploys and a list of new outputs.

A Jig is "spent" when any method is invoked, or its lock undergoes modification. A Jig is regarded as "read" when it is accessed – either as a property of another jig or as a method argument — and no alterations are made.

```ts
interface TxExecution {
  id: string;
  rawtx: string;
  spends: string[];
  reads: string[];
  deploys: Deploy[];
  outputs: Output[];
}

interface Deploy {
  id: string;
  entries: string[];
  files: Array<{
    name: string;
    content: string;
  }>
}

interface Output {
  id: string;
  origin: string;
  location: string;
  class: string;
  lock: {
    type: number;
    data: string;
  };
  state: string;
}
```