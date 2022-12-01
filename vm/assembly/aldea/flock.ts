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
@imported('808973d8869f9f30c588dc9457b9e69dd6538d6688f0a920d6b7482701b8f930')
declare class BasicMath extends Jig {
  static inc (n: u32): u32;
}
