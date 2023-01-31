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
    this.flock.$lock.changeToJigLock()
  }

  replace (anotherFlock: Flock): Flock {
    if (this.flock.legCount() <= anotherFlock.legCount()) {
      const oldFlock = this.flock
      anotherFlock.$lock.changeToJigLock()
      oldFlock.$lock.unlock()
      this.flock = anotherFlock
      return oldFlock
    } else {
      return anotherFlock
    }
  }

  replaceAndSendTo (anotherFlock: Flock, newOwner: ArrayBuffer): void {
    const oldFlock = this.replace(anotherFlock)
    oldFlock.$lock.changeToAddressLock(newOwner)
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


  flockOrigin (): ArrayBuffer {
    return this.flock.$output.origin
  }

  flockLocation (): ArrayBuffer {
    return this.flock.$output.location
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
@imported('486ecf1c64c2898e45a4a3823656aa9bd260e0f0202f195b0e18ca21f2efbfcd')
declare class Flock extends Jig {
  constructor();
  size: u32;
  legCount (): u32;
  grow (): void;
}

// @ts-ignore
@imported('486ecf1c64c2898e45a4a3823656aa9bd260e0f0202f195b0e18ca21f2efbfcd')
declare class InternalFlockOperations extends Jig {
  static growFlock (aFlock: Flock): void
}

