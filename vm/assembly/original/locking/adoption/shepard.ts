// No easy way to ensure that a sheep is only owned by a shepard.

declare function aldeaAdopt (a: any, b: any): void
declare function aldeaRelease (a: any, b: any): void

export class Sheep {
  name: string;

  constructor(name: string) {
    this.name = name
  }
}

export class SheepLink {
  target: Sheep;

  constructor(sheep: Sheep) {
    aldeaAdopt(this, sheep)
    this.target = sheep
  }
}

export class Shepard {
  sheeps: Array<Sheep>;

  constructor() {
    this.sheeps = []
  }

  incorporate(aSheep: Sheep) {
    aldeaAdopt(this, aSheep) // If the user don't do this but some other jig adopts
                             // the sheep at some other point this is problematic.
                             // involves that jig states can be invalid, which is bad.
    this.sheeps.push(aSheep)
  }

  transfer (anotherShepard: Shepard): void {
    const aSheep = this.sheeps.pop()
    aldeaRelease(this, aSheep) // What happens If I don't do this.
    anotherShepard.incorporate(aSheep)
  }
}

