export class Coin extends Jig implements Fungible {
  /** The number of motos in the Coin. */
  amount: u64;

  /**
   * Creates a new Coin instance. Private constructor.
   */
  constructor(amount: u64) {
    super()
    this.amount = amount
  }

  /**
   * Sends a specified number of motos, creating a new Coin with the sent amount.
   * Throws an error if the balance is insufficient.
   */
  send(amount: u64): Coin {
    if (this.amount < amount) throw new Error('insufficient balance')
    this.amount -= amount
    return new Coin(amount)
  }

  /**
   * Combines the motos from an array of Coins into the current Coin, then burns
   * the other Coins.
   */
  combine(coins: Coin[]): Coin {
    this.amount = coins.reduce((total: u64, c: Coin) => total + c.amount, this.amount)
    coins.forEach((coin: Coin) => coin.burn())
    return this
  }

  /**
   * Burns the current Coin by setting its motos to 0 and freezing it.
   */
  protected burn(): void {
    this.amount = 0
    this.$lock.freeze()
  }
}

export interface Fungible {
  /** Represents the quantity of the fungible asset. */
  amount: u64;

  /**
   * Sends a specified amount of the fungible asset. It returns a new instance
   * of the fungible asset with the sent amount deducted from the current
   * instance.
   */
  send(amount: u64): Fungible;

  /**
   * Combines multiple fungible assets into one. It modifies the current
   * instance by adding the balances of the provided fungible assets.
   * The combined fungible asset is returned.
   */
  combine(tokens: Fungible[]): Fungible;
}
