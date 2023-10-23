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

Welcome to the Aldea interactive tutorial. These lessons will teach you everything you need to know to start building on the Aldea Computer. You can also refer to our [learning resources](/learn/about-aldea) and [API docs](/api/sdk/modules) for additional information.

This interactive tutorial provides a complete development environment within your browser, allowing you to explore Aldea without the need to install any tools. However, if you prefer to build locally, you can follow this tutorial on your own machine by creating a project using our [starter kit](https://github.com/aldeacomputer/aldea-js/tree/main/packages/create-aldea):

```
npm create aldea@latest my-project
```

## What is a Jig?

A Jig is a programmable digital object. Jigs are unique instances of classes that can be owned, updated, and composed with other Jigs. In Aldea, *everything* is a Jig. It serves as the fundamental unit of the Aldea Computer.

Jigs are described using simple object-oriented programming. Classes are written in [AssemblyScript](/learn/assemblyscript), which is a statically typed and ahead-of-time compiled variant of TypeScript. Developers familiar with TypeScript will find AssemblyScript to be very similar.

Jig classes must inherit from the `Jig` base class. Throughout these lessons, we will explore the basics of Aldea using the example of a `Potion` class. Later on, we will create actual on-chain instances of `Potion` that can be combined to generate unique instances of `Potion`.

```ts
export class Potion extends Jig {}
```

When you're ready, proceed to the first lesson where you will learn how to model and add fields to your own `Potion` class.
