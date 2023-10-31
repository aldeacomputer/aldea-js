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

  flockIdentifier (): string {
    return `Flock with size: ${this.flock.size}`
  }

  myClassPtr (): ArrayBuffer {
    return this.$output.classPtr
  }

  flockClassPtr (): ArrayBuffer {
    return this.flock.$output.classPtr
  }

  flockOrigin (): ArrayBuffer {
    return this.flock.$output.origin
  }

  flockLocation (): ArrayBuffer {
    return this.flock.$output.location
  }

  breedANewFlock(size: u32): Flock {
    const newFlock = new Flock()
    for (let i: u32 = 0; i++; i < size) {
      newFlock.grow()
    }
    return this.replace(newFlock)
  }
}


export function buildSomeSheepCounter (): SheepCounter {
  return new SheepCounter()
}


// @ts-ignore
@imported('a6ab705aab2865a323f2dac53f7427dc6b2c9ebef697965e1bef392e4bbad8a4')
declare class Flock extends Jig {
  constructor();
  size: u32;
  legCount (): u32;
  grow (): void;
}

