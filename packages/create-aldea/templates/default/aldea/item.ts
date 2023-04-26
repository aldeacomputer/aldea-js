export class Item extends Jig {
  name: string;
  prestige: u8;

  constructor(name: string) {
    super()
    this.name = name
    this.prestige = 1
  }

  incPrestige(val: u8): void {
    if (val < 1 || val > 10) {
      throw new Error('prestige can only be increased by 1-10')
    }
    this.prestige = min(this.prestige + val, 100)
  }
}
