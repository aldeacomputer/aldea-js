/**
 * Represents a highly advanced flock from the future.
 *
 * - an instance has a size
 */
export class Flock extends Jig {
  /**
   * This is a size. The most important property
   */
  size: u32;

  constructor() {
    super();
    this.size = 0;
  }

  /**
   * Makes the flock grow by 1
   */
  grow (): void {
    this.size++
  }

  /**
   * Makes the flock grow by 1 using advanced external mathematical magic.
   */
  growWithMath (): void {
    this.size = BasicMath.inc(this.size);
  }

  groWithExternalFunction (): void {
    this.size = fAddOne(this.size);
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

  returnLockAddres (): ArrayBuffer {
    return this.$lock.getAddressOrFail()
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
    aFlock.$lock.changeToJigLock()
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
@imported('df61ae40a3fb30adf1804b118e88d53112b88b527e1be33cc122e4170ae62f76')
declare class BasicMath extends Jig {
  static inc (n: u32): u32;
}

// @ts-ignore
@imported('df61ae40a3fb30adf1804b118e88d53112b88b527e1be33cc122e4170ae62f76')
declare function fAddOne (n: u32): u32;
