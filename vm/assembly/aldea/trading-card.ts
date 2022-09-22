export class TradingCard {
  name: string;
  power: u32;
  image: string;

  constructor(name: string, power: u32, image: string) {
    this.name = name
    this.power = power
    this.image = image
  }
}
