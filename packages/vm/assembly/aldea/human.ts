export class Human extends Jig implements Person {
  name: string;
  spouse: Human | null;
  parents: StaticArray<Human>;

  constructor(name: string, parents: Human[] = []) {
    super()
    this.name = name
    this.spouse = null
    this.parents = StaticArray.fromArray(parents)
  }

  marry(spouse: Human): void {
    this.spouse = spouse
  }

  child(name: string): Human {
    if (this.spouse) {
      return new Human(name, [this, this.spouse as Human])
    } else {
      throw new Error('human cannot have child without a spouse')
    }
  }
}



export interface Person {
  name: string;
  spouse: Person | null;
  parents: StaticArray<Person>;
  marry(spouse: Person): void;
  child(name: string): Person;
}
