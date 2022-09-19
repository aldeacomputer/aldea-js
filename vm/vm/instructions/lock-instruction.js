export class LockInstruction {
  constructor (jigIndex, lock) {
    this.jigIndex = jigIndex
    this.lock = lock
  }

  exec (context) {
    context.lockJig(this.jigIndex, this.lock)
  }
}
