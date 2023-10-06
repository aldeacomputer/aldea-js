---
sidebar: false
files:
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
        this.freeze()
        other.freeze()
        return new Potion(red, green, blue)
      }

      protected freeze(): void {
        this.$lock.freeze()
      }
    }
open: 'aldea/potion.ts'
---

# Freezing Jigs

In the previous tutorial we created a `mix()` method that mixed two potions togther and returned a new `Potion` Jig with a new color. But we'd missed something.

With the current implementation, it would be possible to repeatedly call `mix()` using the same Jigs and create an infinte number of new `Potion` Jigs. It would be better if the method somehow consumed the input Jigs so they couldn't be re-used.

## The Lock object

All Jigs have a `.$lock` property which exposes the `Lock` object &mdash; an API through which the Jig can be locked using three primary lock types:

- `Address` - the Jig is locked to an address, and can be used when a transaction contains a signature from the corresponding private key.
- `Jig` - the Jig is locked to another Jig, meaning only the parent Jig can call methods on the child Jig.
- `Public` - the Jig is a public Jig, meaning anyone call call it's methods (Aldea-style smart contracts).

We'll cover each of those lock types in future lessons. But for now, lets turn our focus to a fourth, pseudo lock type:

- `Frozen` - the Jig is forever frozen. It can never again be updated or spent in future transactions.

Frozen Jigs are, as the name suggests, locked forever &mdash; unable to move, unable to be updated. This sounds like what we want to do to our input `Potion` Jigs.

Add the following method to your `Potion` class:

```ts
export class Potion extends Jig {
  // ...

  protected freeze(): void {
    this.$lock.freeze()
  }
}
```

The `protected` access modifer works here a little differently to what you might expect. In Aldea, `protected` means the method can be called by only by code in the same package. In our case, it means one instance of `Potion` can call `freeze()` on another instance. In theory, even an instance of another class defined in the same package could call the method. We're effectively saying, only the author of this package can call this method.

::: info Access modifiers
In a [previous lesson](/tutorial/basics/jig-methods) we noted that with **field declarations**, access modifiers serve no purpose and are ignored.

For **method declarations**, access modifiers *do* serve a purpose (but work slightly differently to TypeScript):

- The `private` modifier works as you expect - the method can only be called by `this`.
- The `protected` modifier restricts the caller to code within the same package. That could be other instances of the same class, or other instances of other classes, as long as the class is defined in the same package.
:::

## Wrapping up

Now we're ready to update the `mix()` to ensure the input Jigs cannot be used again after they've been consumed. Ensure `freeze()` is called on both Jigs.

```ts
export class Potion extends Jig {
  // ...

  mix(other: Potion): Potion {
    const red = this.red + other.red
    const green = this.green + other.green
    const blue = this.blue + other.blue
    this.freeze() // [!code ++]
    other.freeze() // [!code ++]
    return new Potion(red, green, blue)
  }
}
```

The `Potion` class looks good to go. It's time to get familiar with the Aldea CLI and SDK, so you can deploy your first package and start mixing some potions.

When you're ready, move on to the next lesson.
