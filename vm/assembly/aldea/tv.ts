export class TV extends Jig {
  powerOn: bool;
  constructor() {
    super()
    this.powerOn = false
  }

  turnOff (): void {
    this.powerOn = false
  }

  turnOn (): void {
    this.powerOn = true
  }
}



