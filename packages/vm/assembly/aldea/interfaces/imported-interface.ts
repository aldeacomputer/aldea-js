//@ts-ignore
@imported("922754d1b2ea179d890966e475be555b3a1f95c175b7cb9ede1acb6c7c5bb0c3")
declare interface Interface1 {
  m1 (): string
}

export class AnotherImplementation extends Jig implements Interface1 {
  m1 (): string {
    return "m1 from another"
  }

  m2 (): Interface1 {
    return new AnotherImplementation()
  }
}
