export interface Runner{
  speed(): number;
  run(energy: u32): void;
}

export class Chita extends Jig implements Runner {
  position: u32[];
  aSpeed: u32;

  constructor() {
    super()
    this.position = [0, 0]
    this.aSpeed = 100
  }

  run(energy: u32): void {
    const movement = energy * 100
    this.position = [ this.position[0] + movement, this.position[1] + movement  ]
  }

  speed(): u32 {
    return this.aSpeed;
  }

  changeSpeed(newSpeed: u32): void {
    this.aSpeed = newSpeed
  }
}

export class Tamer extends Jig {
  pet: Runner

  constructor(aPet: Runner) {
    super();
    this.pet = aPet
  }

  speedTrain (): void {
    this.pet.run(1)
  }
}
