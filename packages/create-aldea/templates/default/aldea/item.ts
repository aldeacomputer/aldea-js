export class Item extends Jig {
  name: string;
  power: u8;

  constructor(name: string) {
    super()
    this.name = name
    this.power = 1
  }

  addPower(val: u8): void {
    if (val < 1 || val > 10) {
      throw new Error('power can only be increased by 1-10')
    }
    this.power = min(this.power + val, 100)
  }
}
