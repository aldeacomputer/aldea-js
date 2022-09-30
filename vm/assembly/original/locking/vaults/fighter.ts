import { JigBox } from "./jigBox";

interface Weapon {
  getPower (): u32;
}

class Fighter {
  weaponBox: JigBox<Weapon>;

  constructor() {
    this.weaponBox = new JigBox();
  }

  equip (aWeapon: Weapon) {
    this.weaponBox.save(aWeapon);
  }

  drop (): Weapon {
    const weapon = this.weaponBox.releaseOrHalt();
    // -- the box is empty -> this.arm.isEmpty() === true
    return weapon;
  }

  attackPower (): u32 {
    const weaponPower = this.weaponBox.insideOr<u32>( (w: Weapon) => w.getPower(), () => 0 )
    return 1 + (
      this.weaponBox.isEmpty()
        ? 0
        : weaponPower
    )
  }
}
