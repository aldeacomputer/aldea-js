const DEATH: u64 = 100000;
const HOARD: u64 = 0;

export class Tower extends Jig {
  dead: bool = false;
  hoard: u64 = HOARD;

  constructor() {
    super();
  }

  spawn(inc: u64): void {
    if(this.dead) throw new Error('Tower is dead');
    this.hoard += inc;
    if(this.hoard > DEATH) {
      this.dead = true;
    }
  }

  fire(): void {
    if(this.dead) throw new Error('Tower is dead');
    if (this.hoard > 0) {
      this.hoard--
    }
  }
}
