---
sidebar: false
setup:
  - 'rm -rf aldea'
files:
  aldea/main.ts: |
    export class Potion extends Jig {
      constructor() {
        super()
      }
    }
  aldea/foobar.txt: abc
solution:
  aldea/main.ts: |
    export class Potion extends Jig {
      constructor(
        public foo: u16,
        public bar: u16,
      ) {
        super()
      }
    }
open: 'aldea/main.ts'
---

# 1: Fields

Some learning text about fields...

::: info
Did you know, bla bla bla
:::

- add a field called `foo` with a type of `u16`
- add a field called `bar` with a type of `u16`

bla bla bla