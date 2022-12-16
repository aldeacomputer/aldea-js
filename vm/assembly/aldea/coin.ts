export class Coin extends Jig {
  amount: u32;

  constructor(amount: u32) {
    super()
    this.amount = amount
  }

  send (amount: u32, newOwner: ArrayBuffer): Coin {
    if(this.amount < amount){
      throw new Error('not enough coins')
    }
    this.amount -= amount
    const newCoin = new Coin(amount)
    newCoin.$lock.toPubkeyHash(newOwner)
    return newCoin

  }

  merge(coin: Coin): Coin {
    const prevAmount = this.amount
    this.amount += coin.amount
    if(this.amount < prevAmount ){
      throw new Error('Overflow error')
    }
    coin.combineInto()
    return this
  }

  private combineInto(): void {
    this.amount = 0
    this.$output.destroy()
  }

}



