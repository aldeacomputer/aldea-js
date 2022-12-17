import { canCall } from 'aldea/auth'

export class SheepCounter extends Jig {
  sheepCount: u32;
  legCount: u32;

  constructor() {
    super();
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

  countShepherd (aShepherd: Shepherd): u32 {
    this.sheepCount += aShepherd.sheepCount()
    this.legCount += aShepherd.legCount()
    return this.sheepCount
  }

  secureCountFlock (flock: Flock): u32 {
    if (canCall(flock)) {
      return this.countFlock(flock)
    }
    return this.sheepCount
  }
}

export class Shepherd extends Jig {
  flock: Flock;

  constructor (aFlock: Flock) {
    super()
    this.flock = aFlock
    this.flock.$lock.toCaller()
  }

  replace (anotherFlock: Flock): Flock {
    if (this.flock.legCount() <= anotherFlock.legCount()) {
      const oldFlock = this.flock
      anotherFlock.$lock.toCaller()
      oldFlock.$lock.unlock()
      this.flock = anotherFlock
      return oldFlock
    } else {
      return anotherFlock
    }
  }

  replaceAndSendTo (anotherFlock: Flock, newOwner: ArrayBuffer): void {
    const oldFlock = this.replace(anotherFlock)
    oldFlock.$lock.toPubkeyHash(newOwner)
  }

  legCount (): u32 {
    return this.flock.legCount() + 2
  }

  sheepCount (): u32 {
    return this.flock.size
  }

  growFlockUsingInternalTools (): void {
    InternalFlockOperations.growFlock(this.flock)
  }

  growFlockUsingExternalTools (): void {
    ExternalFlockOperations.growFlock(this.flock)
  }

  static returnAFlock (someFlock: Flock): Flock {
    return someFlock
  }
}

export class ExternalFlockOperations extends Jig  {
  static growFlock (aFlock: Flock): void {
    aFlock.grow()
  }
}


export function buildSomeSheepCounter (): SheepCounter {
  return new SheepCounter()
}


// @ts-ignore
@imported('715fa9ea6974c387ad5839c697dcd1ee789fb0504b306d5452e6b08820bb8d1e')
declare class Flock extends Jig {
  constructor();
  size: u32;
  legCount (): u32;
  grow (): void;
}

// @ts-ignore
@imported('715fa9ea6974c387ad5839c697dcd1ee789fb0504b306d5452e6b08820bb8d1e')
declare class InternalFlockOperations extends Jig {
  static growFlock (aFlock: Flock): void
}

