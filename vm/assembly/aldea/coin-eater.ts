export class CoinEater extends Jig {
  lastCoin: Coin
  otherCoins: Coin[]

  constructor(aCoin: Coin) {
    super()
    aCoin.$lock.changeToJigLock()
    this.lastCoin = aCoin
    this.otherCoins = []
  }

  addCoin (aCoin: Coin): void {
    aCoin.$lock.changeToJigLock()
    this.otherCoins.push(this.lastCoin)
    this.lastCoin = aCoin
  }

  combineAll (): void {
    this.otherCoins.forEach(c => c.$lock.unlock())
    this.lastCoin = this.lastCoin.combine(this.otherCoins)
    this.lastCoin.$lock.changeToJigLock()
    this.otherCoins = []
  }
}
