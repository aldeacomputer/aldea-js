import { canLock } from 'aldea/auth'

/**
 * Fighter class
 */
export class Fighter extends Jig {
  name: string;
  gear: Item[];
  health: i8 = 100;

  constructor(name: string) {
    super()
    this.name = name
    this.gear = []
  }

  equip(item: Item): void {
    if (canLock(item)) {
      item.$lock.toCaller()
      this.gear.push(item)
    }
  }

  attack(other: Fighter): void {
    const power = this.gear.reduce<i8>((power, item) => power + item.power, 0)
    other.takeDamage(power)
  }

  private takeDamage(damage: i8): void {
    this.health -= damage
    if (this.health < 0) {
      // todo - update to freeze when changes to compiler made
      this.$output.destroy()
    }
  }
}

/**
 * Item class
 */
export class Item extends Jig {
  name: string;
  power: i8;

  constructor(name: string, power: i8) {
    if (power < 0 || power > 20) {
      throw new Error("an item's power must be between 0 and 20")
    }
    super()
    this.name = name
    this.power = power
  }
}