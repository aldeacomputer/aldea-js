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

Aldea truly shines when Jigs interact with other Jigs. This is known as composability, and as you progress in your Aldea learning journey, you'll discover that composability is one of Aldea's greatest strengths.

Let's begin with a simple example for now. Modify the field declarations in your `Potion` class to include `red`, `green`, and `blue` properties, each of type `u8`.

```ts
export class Potion extends Jig {
  red: u8;
  green: u8;
  blue: u8;
}
```

These properties represent the channels of the RGB color model and are of type `u8`, which is an 8-bit unsigned integer.

::: info What the type?
In TypeScript, there is a single `number` type that can represent any numeric value up to a certain length.

In Aldea, which is based on AssemblyScript, we have to pay attention to the length and signedness of integers.

- There are 4 signed integer types: `i8`, `i16`, `i32`, and `i64`.
- There are 4 unsigned integer types: `u8`, `u16`, `u32`, and `u64`.
- There are also 2 float types: `f32` and `f64`.
:::

Also update the constructor of your `Potion` class to accept and initialize these three properties:

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

Write a method declaration that takes a second potion as an argument. We'll use the following simple algorithm to mix the colors:

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

What's happening here? We mix two colors by simply adding their respective color channels together. The resulting values for red, green, and blue are used to create a new `Potion` jig. While this mixing algorithm may not satisfy color theory purists, it is a straightforward approach that avoids repeated mixing trending to an average gray color.

::: info Integer overflows
In TypeScript, adding two color integers together may result in a value outside the range of `0..255`. In that case, we would need to calculate the modulus with a divisor of 256.

However, in AssemblyScript, since our color types are `u8`, we don't need to worry about this issue. When an arithmetic operation overflows, it automatically wraps around.

```ts
// typescript
100 as number + 200 as number // => 300

// assemblyscript (u8 type)
100 as u8 + 200 as u8 // => 44
```
:::

Before you proceed to the next lesson, take a moment to consider if we have missed anything.

Think about it... We started with two potions, mixed them together, and created a third potion. What haven't we done?
