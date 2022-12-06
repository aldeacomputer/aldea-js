export class Coin extends Jig {
  amount: u32;

  constructor(amount: u32) {
    super()
    this.amount = amount
  }

  fund (): void {
    if (this.amount < 100) {
      throw new Error('not enough coins')
    }
    this.amount -= 100
  }
}



