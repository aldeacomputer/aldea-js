---
sidebar: false
setup:
  - 'rm -rf aldea'
filesx:
  aldea:
    main.ts: |
      export class Potion extends Jig {
        constructor() {
          super()
        }
      }
files:
  aldea/main.ts: |
    export class Potion extends Jig {
      constructor() {
        super()
      }
    }
  aldea/xxx.ts: abc
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

# Tutorial 1: fields

Some learning text about fields...

- add a field called `foo` with a type of `u16`
- add a field called `bar` with a type of `u16`

bla bla bla