export class ForeverCounter {
  count: u32;

  constructor() {
    this.count = 0
  }

  init (): void {
    Auth.lockToAnyone<ForeverCounter>(this)
  }

  inc (): void {
    this.count++
  }
}

export class NormalCounter {
  count: u32;

  constructor() {
    this.count = 0
  }

  inc (): void {
    this.count++
  }
}

export class MakePublic {
  constructor() {}

  makeCounterPublic (counter: NormalCounter): void {
    Auth.lockToAnyone<NormalCounter>(counter)
  }

  makeFlockPublic (flock: Flock): void {
    Auth.lockToAnyone<Flock>(flock)
  }
}

// @ts-ignore
@imported('6328a8bfe682ecc5a318b603fecbfc278f27e1ba729dc67659678b176aa8e188')
declare class Flock {}
