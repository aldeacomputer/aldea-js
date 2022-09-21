export class Flock {
  size: u32;

  constructor(size: u32) {
    this.size = size;
  }

  legCount (): u32 {
    return this.size * 4;
  }
}
