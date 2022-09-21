export class Toothpaste {
  color: string;
  weight: u8;

  constructor(color: string) {
    this.color = color;
    this.weight = 100;
  }

  use (): void {
    this.weight--;
  }
}
