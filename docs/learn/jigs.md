# Jigs

A Jig is a programmable digital object. Jigs are unique instances of classes that can be owned, updated, and composed with other Jigs.

In Aldea, *everything is a Jig* - it is the foundational unit of the Aldea Computer. Jigs are described using simple object-oriented programming. Classes are written using [AssemblyScript](/learn/assemblyscript), a variant of TypeScript that millions od developers will find refreshingly familiar.

## Interactive objects

Jigs are modelled and shaped using class field declarations. Fields can be vitually any AssemblyScript type, including complex types such as Maps and Sets, and even other instances of Jigs.

Every property of a Jig is publicly readable but exclusively privately writable, implying that Jigs must expose public methods so the outside world can interact with the Jig and update its properties.

Whilst access modifiers on fields serve no purpose, in the case of methods they have significance and function slightly differently compared to TypeScript.

|             | Aldea                                                                       | TypeScript                                                |
| ----------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `protected` | Visible to any code in the same package, (even other classes and functions) | Visible to subclasses of the class they're declared in.   |
| `private`   | Visible exclusively to `this` instance.                                     | Visible to `this`, and other instances of the same class. |

By default, all methods carry `public` visibility, providing universal access

## Locks

Whilst anyone can read any Jig, a lock mechanism dictates who is permitted to update the Jig. There are three primary lock types:

- **Address**: Locked to a specific address; the Jig can be used in a transaction containing a signature from the associated private key.
- **Jig**: The Jig is locked to another Jig, meaning only the parent Jig can interact with the child Jig.
- **Public**: A Jig under the public lock is open to interaction by anyone, essentially creating a smart contract.

Jigs can also be `Frozen`, meaning they can longer be executed or updated. The state of a Frozen Jig remains a permanent part of the blockchain, which can always be proven, but nodes will dispose of frozen outputs in time.

## Outputs

Jigs are created and updated through transactions. When a transaction is executed, all the necessary information reqarding the subsequent state of the affected Jigs is captured in its outputs.

A Jig can be identified either through its unique 32-byte `output_id` hash, or by its `origin`, a 34-byte `Pointer` combining transaction ID and output index.

Outputs carry a Jig's `location` (the current `Pointer`) and its `origin` (the initial `Pointer`). The `output_id` is used to address a specific Jig, whereas the `origin` is commonly used to load smart contracts, when the same ublic Jig is being accessed by multiple parties.

Lastly, Outputs encapsulate the `state` of the Jig, encoding it using BCS.
