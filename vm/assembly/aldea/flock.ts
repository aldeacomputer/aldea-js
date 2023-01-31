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
@imported('a4fa4b025b480f2f3f40217716893e4e64bfa519330335b4347ee3d41743208d')
declare class BasicMath extends Jig {
  static inc (n: u32): u32;
}

// @ts-ignore
@imported('a4fa4b025b480f2f3f40217716893e4e64bfa519330335b4347ee3d41743208d')
declare function fAddOne (n: u32): u32;
