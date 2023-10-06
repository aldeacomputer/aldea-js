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

# Discover the CLI