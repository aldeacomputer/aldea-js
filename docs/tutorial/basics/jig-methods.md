---
sidebar: false
files:
  aldea/potion.ts: |
    export class Potion extends Jig {
      label: string;

      constructor(label: string) {
        super()
        this.label = label
      }
    }
solution:
  aldea/potion.ts: |
    export class Potion extends Jig {
      label: string;

      constructor(label: string) {
        super()
        this.label = label
      }

      updateLabel(label: string): void {
        this.label = label
      }
    }
open: 'aldea/potion.ts'
---

# Methods: interactive objects

A key concept to understand about Jigs, is that every single property is always readable publicly, but can only be written privately. That is to say, anyone and any other Jig can always read every Jig propterty (it is a public blockchain afterall), but a Jig can only write it's own properties.

::: info Access modifiers
In TypeScript, access modifiers such as `protected` and `private` can by added to field declarations to control the visibility of of the property.

In Aldea, access modifiers on field declarations are ignored. As explained, all Jig properties are public for reading, and private for writing, so access modifiers serve no purpose.
:::

Jigs must therefore expose public methods through which the outside world can interact with the Jig and update its properties.

```ts
export class Potion extends Jig {
  //...

  updateLabel(label: string): void {
    this.label = label
  }
}
```

Unlike TypeScript, in Aldea all method and function declarations must contain fully typed method signatures including the return type.

### Your turn

Update the `Potion` class and make the following change:

1. Add a method to the class called `updateLabel` that accepts `label` as an argument and assigns it to the `label` property.

When you're ready, move on to the next lesson.
