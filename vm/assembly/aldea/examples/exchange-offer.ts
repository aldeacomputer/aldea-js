/**
 * This envelope is used to exchange an element of a collection to an element of other collection.
 * Optionally you can request some money to complement the value of the items.
 */
export class ExchangeOffer extends Jig {
  content: CollectionItem
  wantedCollection: string
  price: u64
  nextOwner: ArrayBuffer

  /**
   * @param nextOwner Address of the autor of the exchange.
   * @param nft Object put to the public to be exchanged
   * @param wantedCollection Which nft collection is acepted in the exchange
   * @param price Extra money requested
   */
  constructor(nextOwner: ArrayBuffer, nft: CollectionItem, wantedCollection: string, price: u64) {
    super()
    this.nextOwner = nextOwner
    this.content = nft
    this.wantedCollection = wantedCollection
    this.price = price
    this.content.$lock.changeToJigLock()
    this.$lock.changeToPublicLock()
  }

  /**
   * Atomically swap the content of the envelope by the nft provided and `this.price` coins.
   *
   * @param another
   * @param coin
   */
  exchange(another: CollectionItem, coin: Coin): CollectionItem {
    // If not enough money provided fail
    if (coin.motos < this.price) {
      throw new Error('not enough funds')
    }

    // If the provided item does not bellong to the wanted collection fail.
    if (another.collectionName !== this.wantedCollection) {
      throw new Error(`not the right collection. Provided: ${another.collectionName}, expected: ${this.wantedCollection}`)
    }

    // Send the nft to the author of the offer.
    another.$lock.changeToAddressLock(this.nextOwner)

    // Send `this.price` coins to the author of the exchange.
    const anotherCoin = coin.send(this.price)
    anotherCoin.$lock.changeToAddressLock(this.nextOwner)

    // Freeze the offer because it's done.
    // this.$lock.freeze()

    // Unlock and return the content of the offer.
    this.content.$lock.unlock()
    return this.content
  }
}

//@ts-ignore
@imported('3d25c3e40bc0df2fa9ae086c8f9fe15eb8f783e79d5a75ecf97a88d97283d325')
declare class CollectionItem extends Jig {
  id: u32
  collectionName: string
}
