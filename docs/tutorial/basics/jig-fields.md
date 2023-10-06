---
sidebar: false
setup:
  - 'rm -rf aldea'
files:
  aldea/potion.ts: |
    export class Potion extends Jig {
    }
solution:
  aldea/potion.ts: |
    export class Potion extends Jig {
      label: string;

      constructor(label: string) {
        super()
        this.label = label
      }
    }
open: 'aldea/potion.ts'
---

# Fields: modelling objects

Field declarations create a property on a class. This is how Jig's are modelled to contain data. A field declaration contains a name and type annotation.  Optionally, a field declaration may have an *initializer* which sets the property's default value.

```ts
export class Potion extends Jig {
  label: string = 'My Potion';
}
```

Where fields don't have initializers, it is necessary to initialize the property value inside the constructor.

```ts
export class Potion extends Jig {
  label: string;

  constructor(label: string) {
    super()
    this.label = label
  }
}
```

Notice that it is also necessary to add type annotations to the arguments in the method signature, Also `super()` must be called before accessing `this`. The second one is a common gotcha, but your IDE should warn you if you forget to do so.

### Your turn

We'll keep things very simple to start with. Edit `potion.ts` and make the following changes:

1. Add a field to the class called `label` with the type `string`.
2. Add a constructor method that accepts the `label` as an argument and assigns it to the `label` property.

When you're ready, move on to the next lesson.
