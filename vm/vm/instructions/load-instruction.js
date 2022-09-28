export class LoadInstruction {
  constructor (location) {
    this.location = location
  }

  exec (context) {
    context.loadJig(this.location)
  }

  encode () {
    return `LOAD ${this.location}`
  }

  getPubKey () {
    return null
  }
}
