export class Coin extends Jig {
  motos: u64;

  constructor(amount: u64) {
    super()
    this.motos = amount
  }

  send (amount: u64, newOwner: ArrayBuffer): Coin {
    if(this.motos < amount){
      throw new Error('not enough coins')
    }
    this.motos -= amount
    const newCoin = new Coin(amount)
    newCoin.$lock.toAddress(newOwner)
    return newCoin

  }

  combine(coins: Coin[]): Coin {
    this.motos = coins.reduce((total: u64, c: Coin) => total + c.motos, this.motos)
    coins.forEach((coin: Coin) => {
      coin.combineInto()
    })
    return this
  }

  private combineInto(): void {
    this.motos = 0
    this.$lock.freeze()
  }
}



