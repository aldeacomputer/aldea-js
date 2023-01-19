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
    this.$lock.freeze();
  }

  returnSelf (): Flock {
    return this
  }

  returnLocation (): ArrayBuffer {
    return this.$output.location
  }

  returnOrigin (): ArrayBuffer {
    return this.$output.origin
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

export class FlockBag extends Jig {
  flocks: Flock[];

  constructor () {
    super();
    this.flocks = []
  }

  addFlock (aFlock: Flock): void {
    aFlock.$lock.changeToCallerLock()
    this.flocks.push(aFlock)
  }

  growAll (): void {
    this.flocks.forEach((fl: Flock) => {
      fl.grow()
    })
  }
}

export class InternalFlockOperations extends Jig {
  static growFlock (aFlock: Flock): void {
    aFlock.grow()
  }
}

// @ts-ignore
@imported('8a5916340ec86825f6e9bd0013271e9081a96d1d7d57865ef16c932cbb8c412c_0')
declare class BasicMath extends Jig {
  static inc (n: u32): u32;
}
