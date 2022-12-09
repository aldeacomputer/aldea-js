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

  goToFridge (): void {
    this.$output.destroy();
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
@imported('0404d88a7128eb9064bfa5bbd2479abdb9d1213807f829d972315adabc87d8c2')
declare class BasicMath extends Jig {
  static inc (n: u32): u32;
}
