export interface Interface1 {
  m1 (): string
}

export class Implementation1 extends Jig implements Interface1 {
  m1 (): string {
    return 'm1 from Implementation1'
  }

  m2 (): Interface1 {
    return new Implementation1()
  }
}
