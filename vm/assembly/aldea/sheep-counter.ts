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

  countShepherd (aShepherd: Shepherd): u32 {
    this.sheepCount += aShepherd.sheepCount()
    this.legCount += aShepherd.legCount()
    return this.sheepCount
  }

  secureCountFlock (flock: Flock): u32 {
    const canCall = Auth.authcheck(flock, AuthCheck.CALL)
    if (canCall) {
      return this.countFlock(flock)
    }
    return this.sheepCount
  }
}

export class Shepherd {
  flock: Flock;

  constructor (aFlock: Flock) {
    this.flock = aFlock
    Auth.lockToParent<Flock, Shepherd>(aFlock, this)
  }

  replace (anotherFlock: Flock): Flock {
    if (this.flock.legCount() <= anotherFlock.legCount()) {
      const oldFlock = this.flock
      Auth.lockToParent<Flock, Shepherd>(anotherFlock, this)
      Auth.lockToNone(oldFlock)
      this.flock = anotherFlock
      return oldFlock
    } else {
      return anotherFlock
    }
  }

  replaceAndSendTo (anotherFlock: Flock, newOwner: ArrayBuffer): void {
    const oldFlock = this.replace(anotherFlock)
    Auth.lockToPubkey(oldFlock, newOwner)
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
}

export class ExternalFlockOperations {
  static growFlock (aFlock: Flock): void {
    aFlock.grow()
  }
}


export function buildSomeSheepCounter (): SheepCounter {
  return new SheepCounter()
}


// @ts-ignore
@imported('6e3553a6bea33cc88435ccc256a3aae3a736b10097b13f4f9f6d068fdf890043')
declare class Flock {
  constructor();
  size: u32;
  legCount (): u32;
  grow (): void;
}

// @ts-ignore
@imported('6e3553a6bea33cc88435ccc256a3aae3a736b10097b13f4f9f6d068fdf890043')
declare class InternalFlockOperations {
  static growFlock (aFlock: Flock): void
}

