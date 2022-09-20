export class JigArg {
  constructor (masterListIndex) {
    this.index = masterListIndex
  }

  get (context) {
    const jig = context.getJigRef(this.index)
    return jig.origin
  }

  encode () {
    return `$${this.index}`
  }
}
