export class Flock {
  size: u32;

  constructor() {
    this.size = 0;
  }

  grow (): void {
    this.size ++;
  }

  growMany (amount: u32): void {
    this.size += amount;
  }

  legCount (): u32 {
    return this.size * 4;
  }

  static createWithSize(n: u32): Flock {
    const aFlock = new Flock();
    while (n > 0) {
      aFlock.grow()
      n--
    }
    return aFlock
  }
}

// @ts-ignore
@imported('./basic-math.wasm')
declare class BasicMath {
  static inc (n: u32): u32;
}
