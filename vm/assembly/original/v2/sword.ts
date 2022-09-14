import {Fighter} from "./fighter";
import {Weapon} from "./weapon";

export class Sword extends Weapon {
  constructor() {
    super();
    this.power = 1;
  }

  use (fighter: Fighter) {
    fighter.receiveDamage(1);
    this.power++;
  }

  weight(): u32 {
    return 2;
  }
}
