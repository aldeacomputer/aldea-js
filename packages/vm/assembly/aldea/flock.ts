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

export function flockWithSize(size: u32): Flock {
  let flock = new Flock()
  let i = size
  while (i > 0) {
    flock.grow()
    i -= 1
  }
  return flock
}

// @ts-ignore
@imported('09a5863f97d825fdd9d46389b1ce22c77ff10dd16eee12a98fdfdca7bdb91849')
declare function fAddOne (n: u32): u32;
