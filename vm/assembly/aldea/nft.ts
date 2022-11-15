export class NFT extends Jig {
  name: string;
  rarity: u32;
  image: string;

  constructor(name: string, rarity: u32, image: string) {
    super()
    this.name = name
    this.rarity = rarity
    this.image = image
  }
}
