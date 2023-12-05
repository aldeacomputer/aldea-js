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

Field declarations create properties on a class, allowing Jigs to contain data. A field declaration consists of a name and a type annotation. Optionally, a field declaration can include an *initializer* to set the property's default value.

```ts
export class Potion extends Jig {
  label: string = 'My Potion';
}
```

If a field doesn't have an initializer, you need to initialize the property value inside the constructor.

```ts
export class Potion extends Jig {
  label: string;

  constructor(label: string) {
    super()
    this.label = label
  }
}
```

Note that you must also add type annotations to the arguments in the method signature. Additionally, remember to call `super()` before accessing `this` in the constructor. Forgetting to do so is a common mistake, but your IDE should warn you about it.

### Your turn

Let's start with some simple changes to `potion.ts`:

1. Add a field called `label` to the class with the type `string`.
2. Implement a constructor method that takes `label` as an argument and assigns it to the `label` property.

Once you're done, you can proceed to the next lesson.
