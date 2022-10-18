export class TV {
  powerOn: bool;
  constructor() {
    this.powerOn = false
  }

  turnOff (): void {
    this.powerOn = false
  }

  turnOn (): void {
    this.powerOn = true
  }
}



