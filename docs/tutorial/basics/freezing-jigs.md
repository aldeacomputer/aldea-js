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

In the previous tutorial, we created a `mix()` method that combines two potions and returns a new `Potion` Jig with a different color. However, there is an issue with the current implementation.

Currently, it is possible to repeatedly call `mix()` using the same Jigs and create an infinite number of new `Potion` Jigs. It would be better if the method consumed the input Jigs so that they couldn't be reused.

## The Lock object

All Jigs have a `.$lock` property that exposes the `Lock` object, which provides an API for locking the Jig using three primary lock types:

- `Address`: The Jig is locked to an address and can be used when a transaction contains a signature from the corresponding private key.
- `Jig`: The Jig is locked to another Jig, meaning only the parent Jig can call methods on the child Jig.
- `Public`: The Jig is a public Jig, meaning anyone can call its methods (Aldea-style smart contracts).

We will cover each of these lock types in future lessons. For now, let's focus on what is essentially a fourth lock type:

- `Frozen`: The Jig is permanently frozen. It can never be updated or spent in future transactions.

Frozen Jigs are, as the name suggests, frozen forever. They cannot be updated or unfrozen. This is what we want to do to our input `Potion` Jigs.

Add the following method to your `Potion` class:

```ts
export class Potion extends Jig {
  // ...

  protected freeze(): void {
    this.$lock.freeze()
  }
}
```

The `protected` access modifier works a little differently to what you might expect. In Aldea, `protected` means the method can only be called by code in the same package. In our case, it means one instance of `Potion` can call `freeze()` on another instance. In theory, even an instance of another class defined in the same package could call the method. We're effectively saying that the author of this package decides who can call this method.

::: info Access modifiers
In a [previous lesson](/tutorial/basics/jig-methods), we noted that with **field declarations**, access modifiers serve no purpose and are ignored.

For **method declarations**, access modifiers *do* serve a purpose (but work slightly differently than in TypeScript):

- The `private` modifier works as you would expect - the method can only be called by `this`.
- The `protected` modifier restricts the caller to code within the same package. This can include other instances of the same class or other instances of other classes as long as the class is defined in the same package.
:::

## Wrapping up

Now we need to update the `mix()` method to ensure that the input Jigs cannot be used again after they have been consumed. Make sure to call `freeze()` on both Jigs.

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

The `Potion` class is now ready. It's time to become familiar with the Aldea CLI and SDK so that you can deploy your first package and start mixing some potions.

When you're ready, move on to the next lesson.
