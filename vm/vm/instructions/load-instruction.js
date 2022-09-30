export class LoadInstruction {
  constructor (location, force = false) {
    this.location = location
    this.forceLocation = force
  }

  exec (context) {
    context.loadJig(this.location, this.forceLocation)
  }

  encode () {
    return `LOAD ${this.location}`
  }

  getPubKey () {
    return null
  }
}
