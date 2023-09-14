export class WithBooleans extends Jig {
  prop1: bool;
  prop2: bool;

  constructor (bool1: bool, bool2: bool) {
    super()
    this.prop1 = bool1
    this.prop2 = bool2
  }

  flip (): void {
    this.prop1 = !this.prop1
    this.prop2 = !this.prop2
  }
}
