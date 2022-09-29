declare function aldeaAdopt (a: any, b: any): void

export class Sheep {
  name: string;

  constructor(name: string) {
    this.name = name
  }
}

export class Shepard {
  sheeps: Array<Sheep>;

  constructor() {
    this.sheeps = []
  }

  adopt(aSheep: Sheep) {
    aldeaAdopt(this, aSheep) // If the user don't do this but some other jig adopts
                             // the sheep at some other point this is problematic.
                             // involves that jig states can be invalid, which is bad.
    this.sheeps.push(aSheep)
  }
}

