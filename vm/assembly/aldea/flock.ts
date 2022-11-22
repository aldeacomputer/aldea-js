export class Flock extends Jig {
  size: u32;

  constructor() {
    super();
    this.size = 0;
  }

  grow (): void {
    this.size++
  }

  growWithMath (): void {
    this.size = BasicMath.inc(this.size);
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

export class InternalFlockOperations extends Jig {
  static growFlock (aFlock: Flock): void {
    aFlock.grow()
  }
}

// @ts-ignore
@imported('a1c51b77b44a0964d236e5fe0c93bacc2249ddc3507a20f748fcfa1fcf64e88d')
declare class BasicMath extends Jig {
  static inc (n: u32): u32;
}
