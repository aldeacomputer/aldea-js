import { Equipment } from "./equipment";

export class Weapon extends Equipment {
  weight(): u32 {
    return this.power
  }
}
