export class TVUser extends Jig {
  remote: RemoteControl

  constructor (remote: RemoteControl) {
    super()
    this.remote = remote
    remote.$lock.toCaller()
  }

  watchTvFromCouch (): void {
    this.remote.pressPowerButton() // should work
  }

  watchTvFromTheFloor (): void {
    this.remote.tv.turnOn() // should fail
  }
}

export class RemoteControl extends Jig {
  tv: TV;
  constructor(tv: TV) {
    super()
    this.tv = tv
    tv.$lock.toCaller()
  }

  pressPowerButton (): void {
    if (this.tv.powerOn) {
      this.tv.turnOff();
    } else {
      this.tv.turnOn();
    }
  }
}

// @ts-ignore
@imported("afa5017570bafcfe7d3309e81bcbdd493813edd525ca6e468ceb69a0d1fb84b0")
declare class TV extends Jig {
  powerOn: bool;
  turnOn (): void;
  turnOff (): void;
}
