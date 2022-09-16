export class Person {
  name: string;
  age: u8;

  constructor(name: string, age: u8) {
    this.name = name
    this.age = age
  }

  static mint(): Person {
    return new Person('Old Man', 42)
  }

  rename(name: string): void {
    this.name = name
  }

  getOlder(years: u8): void {
    this.age += years
  }
}
