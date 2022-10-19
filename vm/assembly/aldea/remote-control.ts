export class TVUser {
  remote: RemoteControl

  constructor (remote: RemoteControl) {
    this.remote = remote
    Auth.lockToParent<RemoteControl, TVUser>(remote, this)
  }

  watchTvFromCouch (): void {
    this.remote.pressPowerButton() // should work
  }

  watchTvFromTheFloor (): void {
    this.remote.tv.turnOn() // should fail
  }
}

export class RemoteControl {
  tv: TV;
  constructor(tv: TV) {
    this.tv = tv
    Auth.lockToParent<TV, RemoteControl>(tv, this)
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
@imported("./tv.ts")
declare class TV {
  powerOn: bool;
  turnOn (): void;
  turnOff (): void;
}
