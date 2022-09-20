export class UnlockInstruction {
  constructor (jigIndex, key) {
    this.jigIndex = jigIndex
    this.key = key
  }

  exec (context) {
    const jigRef = context.getJigRef(this.jigIndex)
    jigRef.open(this.key)
    context.addKey(this.key)
  }
}
