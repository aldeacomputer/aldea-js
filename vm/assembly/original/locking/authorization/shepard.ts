// declare function setAuthorizationKey(jig: any, pubkey: any): void;
declare function setAuthorizationJig(jig: any, pubkey: any): void;

export class Sheep {
  name: string;

  constructor(name: string) {
    this.name = name
  }

  send(nextLeader: Shepard): void { // A sheep can only be owned by a sheppard.
    setAuthorizationJig(this, nextLeader);
  }
}

export class RebelSheep extends Sheep {
  send(nextLeader: Shepard): void {
    if (nextLeader.age < 30) {
      throw new Error('un experienced shepard exception')
    }
    setAuthorizationJig(this, nextLeader);
  }
}

export class Shepard {
  sheeps: Array<Sheep>;
  age: u8;

  constructor(age: u8) {
    this.sheeps = [];
    this.age = age
  }

  incorporate (aSheep: Sheep): void {
    aSheep.send(this); // how do I know that I can do this?
    this.sheeps.push(aSheep); // what happens I didn't do the previous line?
    // This approach also requires scan state.
  }

  transferSheep (anotherShepard: Shepard): void {
    const sheep = this.sheeps.pop();
    sheep.send(anotherShepard)
    anotherShepard.incorporate(sheep);
  }
}
