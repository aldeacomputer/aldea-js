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
    newCoin.$lock.toPubkeyHash(newOwner)
    return newCoin

  }

  merge(coins: Array<Coin>): Coin {
    coins.forEach(coin => {
      this.motos += coin.motos
      coin.combineInto()
    })
    return this
  }

  private combineInto(): void {
    this.motos = 0
    this.$output.destroy()
  }

}



