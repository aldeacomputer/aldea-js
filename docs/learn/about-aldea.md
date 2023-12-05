# About Aldea

Aldea is a decentralized computing platform.

> Aldea's mission is to make building on blockchain a faster, simpler and more delightful experience for developers across the globe.

By combining a simple programming model with a developer-friendly ecosystem, Aldea propels blockchain development to new heights. Create NFTs, on-chain games, decentralized social networks, and much more using refreshingly familliar tools and programming concepts.

## Dev workflow

Developing on Aldea is oriented around two principal actions: developing packages - code that is deployed on-chain that creates and interracts with on-chain objects called Jigs; and developing apps - the real-world interfaces to the on-chain world.

### Developing packages

Packages in Aldea are collections of one or more source code files written in a variant of TypeScript called [AssemblyScript](/learn/assemblyscript). When a package is deployed onto the Aldea Computer, it results in the compilation of a WebAssembly (WASM) binary. Packages export classes and functions that can be imported by other packages or invoked directly via transactions.

[See our developer quickstart](/learn/dev-quickstart).

### Developing apps

Real world apps and services that leverage the Aldea Computer can be written in any language with traditional front- and back-end technologies. Apps interact with on-chain code through transactions, treating the blockchain as a global decentralized state machine. The state is updated by creating object instances and calling methods via transactions.

[Understand transactions](/learn/transactions).

## Key concepts in brief

### Jigs

Jigs in Aldea are instances of classes that contain data and behaviour. The state is encapsulated within the fields of a Jig and gets serialized and stored on the blockchain. A Jig class can define methods that operate directly on its state.

Jigs support inheritance within the same package, and interfaces across packages, paving the way for rich, programmable, and composable state constructs.

[Learn about Jigs](/learn/jigs).

### Packages

Packages in Aldea are the key building blocks of Aldea's ecosystem of reusable code. They export classes and functions that can be used by other packages or accessed via transactions. All packages are deployed on the Aldea Computer under the MIT license, forming a free and open network of shared code.

[Dive deeper into Packages](/learn/packages).


### Transactions

Transactions in Aldea drive state changes on the Aldea Computer. They are a list of instructions, encoding a variety of actions such as loading Jigs, executing code, deploying packages, and adding signatures.

[Discover more about transactions](/learn/transactions).
