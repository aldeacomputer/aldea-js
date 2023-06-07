import { toHex } from 'aldea/bytes'

//@ts-ignore
@imported("f5438178e7420b65297292e18892bd0bd12146a6080af01fba48512c5cb0e718")
declare interface Runner extends Jig{
  speed(): number;
  run(energy: u32): void;
}

export class Gym extends Jig {
  affiliates: Runner[]

  constructor() {
    super()
    this.affiliates = []
  }

  subscribe(runner: Runner): void {
    runner.$lock.changeToJigLock()
    this.affiliates.push(runner)
  }

  train (): void {
    this.affiliates.forEach(a => a.run(1))
  }

  unsubscribe(target: Runner): Runner {
    for (let i = 0; i < this.affiliates.length; i++) {
      const affiliate = this.affiliates[i]
      if (toHex(affiliate.$output.origin) === toHex(target.$output.origin)) {
        affiliate.$lock.unlock()
        return affiliate
      }
    }
    throw new Error('target does not bellong to current gym')
  }
}
