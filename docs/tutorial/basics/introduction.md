---
sidebar: false
files:
  aldea/potion.ts: |
    export class Potion extends Jig {}
solution:
  aldea/potion.ts: |
    export class Potion extends Jig {}
open: 'aldea/potion.ts'
---

# Introduction

Welcome to the Aldea interactive tutorial. Following these lessons will teach you everything you need to know to begin building on the Aldea Computer. You can also consult our [learning resources](/learn/about-aldea) and [API docs](/api/sdk/modules).

This interactive tutorial bundles a full-featured development environment inside your browser so you can kick the tyres of Aldea without installing any tooling. But if you're keen to start building locally, you can also follow this tutorial on your own machine by creating a project with our [starter kit](https://github.com/aldeacomputer/aldea-js/tree/main/packages/create-aldea):

```
npm create aldea@latest my-project
```

## What is a Jig?

A Jig is a programmable digital object. Jigs are unique instances of classes that can be owned, updated, and composed with other Jigs. In Aldea, *everything* is a Jig &mdash; it is the fundamental unit of the Aldea Computer.

Jigs are described using simple object oriented programming. Classes are written using [AssemblyScript](/learn/assemblyscript), a variant of TypeScript that will feel very familiar to many developers. AssemblyScript differs from TypeScript in that it is statically typed and compiled ahead of time.

Jig classes must inherit from the `Jig` base class. Through these lessons we'll explore some of the basics of Aldea using the example of a `Potion` class. Later we'll create real on-chain instances of `Potion` that we can mix together to create new unique instances of `Potion`.

```ts
export class Potion extends Jig {}
```

When you're ready, move on to the first lesson where you'll get to model and add fields to your own `Potion` class.
