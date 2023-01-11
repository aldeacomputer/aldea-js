import { canLock } from 'aldea/auth'

export class PowerUp extends Jig {
  power: u32;

  constructor(power: u32) {
    super()
    this.power = power
  }
}


export class Weapon extends Jig {
  name: string;
  power: u32;
  powerUps: PowerUp[]

  constructor(name: string, power: u32) {
    super()
    this.name = name
    this.power = power
    this.powerUps = []
  }

  sharp(): void {
    this.power += 1
  }

  incorporate(powerUp: PowerUp): void {
    powerUp.$lock.changeToCallerLock()
    this.powerUps.push(powerUp)
    this.power += powerUp.power
  }

  safeIncorporate(powerUp: PowerUp): void {
    if (canLock(powerUp)) {
      this.incorporate(powerUp)
    }
  }

  send (targetPubKey: ArrayBuffer): void {
    this.$lock.changeToAddressLock(targetPubKey)
  }
}
