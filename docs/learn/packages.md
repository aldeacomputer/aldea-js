# Packages

In Aldea, a package is a collection of one or more [AssemblyScript](/learn/assemblyscript) source code files. Once deployed on the Aldea Computer, these files are compiled into a single WebAssembly (WASM) binary.

Similar to an NPM package, an Aldea package exports classes and functions that can be imported into other packages or interacted with directly via transactions. All code deployed on the Aldea Computer becomes a public good, with packages licensed under the MIT license.

## Classes

A package may contain class declarations. Aldea recognizes three types of classes: Jigs, plain objects, and Sidekicks.

### Jigs

A class that extends from `Jig` becomes a [Jig class](/learn/jigs). Jig classes must be exported from the package, a requirement enforced by the compiler.

While a Jig supports inheritance within the same package, extending from an imported Jig is not suported. Instead, composability is facilitated through interfaces.

### Plain objects

A plain object is a class that has fields without a constructor or any methods, solely existing of field declarations. Think of plain objects like a struct in C or Rust. Once a plain object class is declared, objects can be assigned or destructured using JavaScript object syntax.

Plain objects can be arguments in methods and functions or can be stored on a Jig field, as long as the package exports the plain object.

### Sidekicks

Any other class not extending from `Jig` is classified as a "Sidekick". Sidekicks can't be exported from packages, a rule encforced by the compiler.

Sidekicks function as private internal helper classes, and are often combined with static functions to share common non-Jig utility code, for example, base encoding or cryptographic functions.

## Functions

Top-level function declarations in Aldea are pure fuctions that receive arguments and return a result. When a function is exported, it can be imported and called from other packages.

Functions are frequently leveraged to expose a public API to Sidekick code.

## Interfaces

Interfaces in Aldea are designed to promote composability. For instance, Aldea has a built-in `Fungible` interface that wallets and apps can depend on as a consistent behaviour for fungible tokens.

Developers are free to create their own interfaces for any use case. An interface can extend other interfaces, even across different packages. If required, a Jig can implement multiple interfaces at once.
