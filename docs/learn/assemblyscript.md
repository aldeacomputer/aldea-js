# AssemblyScript

Code deployed on the Aldea Computer is written in AssemblyScript, a language that is a variant of TypeScript and compiles to WebAssembly. AssemblyScript has a JavaScript-like standard library with many of the same classes and APIs.

AssemblyScript's familiarity to TypeScript opens the door to Aldea for millions of developers. By lowering the entry barriers, Aldea becomes one of the most intuitive and accessible blockchain platforms to build on.

Unlike TypeScript or JavaScript, AssemblyScript utilizes static typing and compiles ahead of time. While this limits some of JavaScript's dynamic features, it also ensures strict type checking. This vigilance guarantees code accuracy in situations where TypeScript might fall short. Furthermore, Aldea enforces additional constraints to confirm all code deployed on the Aldea Computer is secure and deterministic.

## Aldea for TypeScript developers

If you are a TypeScript developer, then you're already an Aldea developer. Although the landscape is familiar, there are some key differences and nuances to keep in mind.

### Types

- AssemblyScript does not have a single `number` type. Instead developers must carefully chose the types for their numbers based on it's signedness and length (for example, `i8` or `u8`, `i64` or `u64`, or `f32` or `f64`).
- While AssemblyScript doesn't natively offer `BigInt`, Aldea compensates with a bundled `BigInt` library within its runtime.
- While AssemblyScript does not support Union types, it does support nullable types, which allows a data type to be its inherent type or null.
- AssemblyScript sheds some commonly used TypeScript types, including `undefined`, `void` and `any`.

### Access modifiers

- In Aldea, on-chain objects are inherently public, making class field access modifiers irrelevant.
-  In Aldea, public methods mirror TypeScript's functionality. However, `protected` methods are callable by any code within the same package and `private` methods can only be called by `this`.

### Security

- Aldea removes common sources of non-determinism found in JavaScript and TypeScript, like `Math.random()`, to reinforce consistency across all nodes.
- Aldea has no garbage garbage collection, so developers are requires to moniror their memory usage.
- Aldea restricts direct memory access to prevent accidental (or intentional) data corruption.

By understanding these distinctions, TypeScript developers can seamlessly navigate their Aldea journey.
