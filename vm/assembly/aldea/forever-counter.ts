export class ForeverCounter extends Jig {
  count: u32;

  constructor() {
    super()
    this.count = 0
  }

  init (): void {
    this.$lock.toAnyone()
    // Auth.lockToAnyone<ForeverCounter>(this)
  }

  inc (): void {
    this.count++
  }
}

export class NormalCounter extends Jig {
  count: u32;

  constructor() {
    super()
    this.count = 0
  }

  inc (): void {
    this.count++
  }
}

// @ts-ignore
@imported('6328a8bfe682ecc5a318b603fecbfc278f27e1ba729dc67659678b176aa8e188')
declare class Flock extends Jig {}
