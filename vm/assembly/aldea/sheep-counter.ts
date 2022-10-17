export class SheepCounter {
  sheepCount: u32;
  legCount: u32;

  constructor() {
    this.sheepCount = 0;
    this.legCount = 0;
  }

  countSheep(): u32 {
    this.sheepCount++;
    this.legCount += 4;
    return this.sheepCount;
  }

  countFlock(flock: Flock): u32 {
    this.sheepCount += flock.size;
    this.legCount += flock.legCount();
    return this.sheepCount;
  }
}

export class Shepherd {
  flock: Flock;

  constructor (aFlock: Flock) {
    this.flock = aFlock
    Auth.lockToParent<Flock, Shepherd>(aFlock, this)
  }

  replace (anotherFlock: Flock): Flock {
    const currentFlock = this.flock
    if (this.flock.legCount() <= anotherFlock.legCount()) {
      this.flock = anotherFlock
      return currentFlock
    }
    return anotherFlock
  }
}

// @ts-ignore
@imported('./flock.wasm')
declare class Flock {
  size: u32;
  legCount (): u32;
}


