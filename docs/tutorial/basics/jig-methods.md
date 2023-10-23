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

A key concept to understand about Jigs is that every property is publicly readable but can only be privately written. In other words, every property is always accessible and readable to other Jigs and the outside world, but a Jig can only write its own properties.

::: info Access modifiers
In TypeScript, access modifiers like `protected` and `private` can be added to field declarations to control the visibility of properties. However, in Aldea, access modifiers on field declarations are ignored. All Jig properties are public for reading and private for writing, rendering access modifiers redundant.
:::

Therefore, Jigs need to expose public methods through which the outside world can interact with the Jig and update its properties.

```ts
export class Potion extends Jig {
  //...

  updateLabel(label: string): void {
    this.label = label
  }
}
```

Unlike TypeScript, in Aldea, all method and function declarations must include fully typed method signatures, including the return type.

### Your turn

Update the `Potion` class by adding a method called `updateLabel`. This method should accept a `label` argument and assign it to the `label` property.

When you're ready, you can proceed to the next lesson.
