export class Flock {
  size: u32;

  constructor(size: u32) {
    this.size = size;
  }

  grow (): void {
    this.size ++;
  }

  growMany (amount: u32): void {
    this.size += amount;
  }

  legCount (): u32 {
    return this.size * 4;
  }
}
