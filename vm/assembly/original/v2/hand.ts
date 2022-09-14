import { Weapon } from "./weapon";

export class Hand extends Weapon{
  weight(): u32 {
    return 0;
  }
}
