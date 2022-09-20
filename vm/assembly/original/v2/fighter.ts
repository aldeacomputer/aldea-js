import {Weapon} from "./weapon";
import {Armor} from "./armor";
import {Skin} from "./skin";
import {Hand} from "./hand";
import {Equipment} from "./equipment";

declare function aldeaAdopt (jig: any): void;

function max(n1: u8, n2: u8) {
  return n1 >= n2 ? n1 : n2
}

export class Fighter {
  leftArm: Weapon;
  rightArm: Weapon;
  body: Armor;
  head: Armor;
  stash: Array<Equipment>;
  health: u8;

  constructor() {
    this.leftArm = new Hand();
    this.rightArm = new Hand();
    this.body = new Skin();
    this.head = new Skin();
    this.stash = [];
    this.health = 100;
  }

  equipLeftArm(gear: Weapon) {
    aldeaAdopt(gear);
    this.saveGear(this.leftArm);
    this.leftArm = gear;
  }

  equipRightArm(gear: Weapon) {
    aldeaAdopt(gear);
    this.saveGear(this.rightArm);
    this.rightArm = gear;
  }

  equipHead(gear: Armor) {
    aldeaAdopt(gear);
    this.saveGear(this.head);
    this.head = gear;
  }

  equipArmor(gear: Armor) {
    aldeaAdopt(gear);
    this.saveGear(this.body);
    this.body = gear;
  }

  saveGear (gear: Equipment) {
    aldeaAdopt(gear);
    this.stash.push(gear)
  }

  spaceLeft (): u32 {
    return 100 - this.stash.reduce((a, b) => a + b.weight(), 0)
  }

  attack(enemy: Fighter): void {
    const damage = 1 + this.leftArm.power + this.rightArm.power;
    enemy.receiveDamage(damage);
  }

  receiveDamage(damage: u8): void {
    this.health -= max(damage - this.head.power - this.body.power, 0)
  }
}
