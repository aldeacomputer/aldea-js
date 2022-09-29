declare function aldeaAdopt (a: any, b: any): void
declare function aldeaRelease (a: any, b: any): void

declare class Weapon {
  getPower (): u32;
}

export class Fighter {
  arm: Weapon | null;

  constructor() {
    this.arm = null;
  }

  equip (aWeapon: Weapon) {
    aldeaAdopt(this, aWeapon);
    this.arm = aWeapon;
  }

  drop (): Weapon {
    if (this.arm === null) {
      throw new Error('no arm')
    }
    const ret = this.arm;
    this.arm = null;
    aldeaRelease(this, ret)
    return ret;
  }

  attackPower (): u32 {
    return 1 + (
      this.arm === null
        ? 0
        : this.arm.getPower()
    )
  }
}
