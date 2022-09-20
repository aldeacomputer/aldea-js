export class LockInstruction {
  constructor (masterListIndex, lock) {
    this.masterListIndex = masterListIndex
    this.lock = lock
  }

  exec (context) {
    context.lockJig(this.masterListIndex, this.lock)
  }
}
