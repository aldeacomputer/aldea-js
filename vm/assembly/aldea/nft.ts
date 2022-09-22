export class NFT {
  name: string;
  rarity: u32;
  image: string;

  constructor(name: string, rarity: u32, image: string) {
    this.name = name
    this.rarity = rarity
    this.image = image
  }
}
