export class UnlockInstruction {
  constructor (masterListIndex, key) {
    this.masterListIndex = masterListIndex
    this.key = key
  }

  exec (context) {
    const jigRef = context.getJigRef(this.masterListIndex)
    jigRef.open(this.key)
    context.addKey(this.key)
  }

  encode () {
    return `UNLOCK $${this.masterListIndex} "${this.key}"`
  }

  getPubKey () {
    return this.key
  }
}
