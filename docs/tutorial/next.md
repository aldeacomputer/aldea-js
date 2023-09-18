---
sidebar: false
files:
  aldea/main.ts: |
    export class Potion extends Jig {
      constructor(
        public foo: u16,
        public bar: u16,
      ) {
        super()
      }
    }
solution:
  aldea/main.ts: |
    export class Potion extends Jig {
      constructor(
        public foo: u16,
        public bar: u16,
      ) {
        super()
      }

      mix(other: Potion): void {
        this.foo += other.bar
        this.bar += other.foo
        other.$lock.freeze()
      }
    }
open: 'aldea/main.ts'
---

# Tutorial 2: methods

Some learning text about methods...

- add a method called `mix` the mixes two potions by adding `bar` to `foo` and `foo` to `bar`

Some info about lock types....

```ts
this.$lock.freeze()
```

- make sure the mixed potion is frozen.

Well done.