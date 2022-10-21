export class PowerUp {
  power: u32;

  constructor(power: u32) {
    this.power = power
  }
}


export class Weapon {
  name: string;
  power: u32;
  powerUps: PowerUp[]

  constructor(name: string, power: u32) {
    this.name = name
    this.power = power
    this.powerUps = []
  }

  sharp(): void {
    this.power += 1
  }

  incorporate(powerUp: PowerUp): void {
    Auth.lockToParent<PowerUp, Weapon>(powerUp, this)
    this.powerUps.push(powerUp)
    this.power += powerUp.power
  }

  safeIncorporate(powerUp: PowerUp): void {
    const canLock = Auth.authcheck(powerUp, AuthCheck.LOCK)
    if (canLock) {
      this.incorporate(powerUp)
    }
  }

  send (targetPubKey: ArrayBuffer): void {
    Auth.lockToPubkey<Weapon>(this, targetPubKey)
  }
}
