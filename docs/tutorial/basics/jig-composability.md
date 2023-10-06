---
sidebar: false
files:
  aldea/potion.ts: |
    export class Potion extends Jig {
      constructor() {
        super()
      }
    }
solution:
  aldea/potion.ts: |
    export class Potion extends Jig {
      red: u8;
      green: u8;
      blue: u8;

      constructor(r: u8, g: u8, b: u8) {
        super()
        this.red = r
        this.green = g
        this.blue = b
      }

      mix(other: Potion): Potion {
        const red = this.red + other.red
        const green = this.green + other.green
        const blue = this.blue + other.blue
        return new Potion(red, green, blue)
      }
    }
open: 'aldea/potion.ts'
---

# Composability: Jigs interacting with Jigs

Aldea really begins to shine when Jigs start interacting with other Jigs. This is called composability, and the deeper you get into your Aldea learning journey, the more you'll discover that compsability is one of Aldea's super strengths.

But for now, lets start with a simple example. Change the field declarations on your `Potion` class to add `red`, `green` and `blue` properties, each with the type `u8`.

```ts
export class Potion extends Jig {
  red: u8;
  green: u8;
  blue: u8;
}
```

These properties represent the channels of the RGB color model. They each have the type `u8` which is an 8-bit unsigned integer.

::: info What the type?
In TypeScript there is a single `number` type that can be any numeric value up to a certain length.

AssemblyScript is slightly lower lever so in Aldea we care about the length of the integer and it's signedness.

- There are 4 signed integer types: `i8`, `i16`, `i32` and `i64`
- 4 unsigned integer types: `u8`, `u16`, `u32` and `u64`
- And two float types: `f32` and `f64`
:::

Also update your `Potion` constructor to accept and initialize the three properties:

```ts
export class Potion extends Jig {
  // ...

  constructor(r: u8, g: u8, b: u8) {
    super()
    this.red = r
    this.green = g
    this.blue = b
  }
}
```

## Mixing two potions

Write a method declaration that recieves a second potion as an argument. We'll use the following simple algorithm for mixing the colors:

```ts
export class Potion extends Jig {
  // ...

  mix(other: Potion): Potion {
    const red = this.red + other.red
    const green = this.green + other.green
    const blue = this.blue + other.blue
    return new Potion(red, green, blue)
  }
}
```

What's going on here? We are mixing two colors together simply by adding the respective channels togther. The three new values for red, green and blue are then used to return an entirely new `Potion` jig. Color theory purists may raise their eyebrows at this mixing algorithm, but it's simple code and it nicely avoids repeated mixing trending towards an average gray color.

::: info Integer overflows
In TypeScript simply adding the two color integers together may result in a value outside of the range `0..255`. We would need to caculate the modulus with the divisor 256.

In AssemblyScript, because our color types are `u8` we don't need to worry about that as when an arithmetic operation overflows it automatically wraps around.

```ts
// typescript
100 as number + 200 as number // => 300

// assemblyscript (u8 type)
100 as u8 + 200 as u8 // => 44
```
:::

Before you click that "next" button and move on to the next lesson, ask yourself, are we missing anything?

Think about it... We started with two potions, mixed them together and created a third potion. What haven't we done?