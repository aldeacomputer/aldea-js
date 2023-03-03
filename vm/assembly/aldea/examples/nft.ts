/**
 * Object used to create items in a particular collection.
 */
export class CollectionMinter extends Jig {
  collectionName: string;
  nextId: u32;

  /**
   * Creates a new collection with 0 items emited.
   *
   * @param collectionName Name for the collection created with this minter.
   */
  constructor(collectionName: string) {
    super()
    this.collectionName = collectionName
    this.nextId = 0;
  }

  /**
   * Creates a new item in the collection. Each element has an auto incremental unique id.
   */
  mint () : CollectionItem {
    const nft = new CollectionItem(this.nextId, this.collectionName)
    this.nextId += 1
    return nft
  }
}

/**
 * Simple item that represents une particular item in a collection.
 * Each item on the collection can be distinguished (nft).
 */
export class CollectionItem extends Jig {
  id: u32
  collectionName: string

  /**
   * This object can only be created from `CollectionMinter`.
   * @param id unique id for a particular instance of a collection.
   * @param collectionName name of the collection which the element belongs.
   */
  constructor(id: u32, collectionName: string) {
    super()
    // if (!caller.is<CollectionMinter>()) {
    //   throw new Error('Items can only be created from a minter')
    // }
    this.id = id
    this.collectionName = collectionName
  }
}
