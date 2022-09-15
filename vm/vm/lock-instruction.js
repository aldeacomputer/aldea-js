export class LockInstruction {
  constructor (jigIndex, lock) {
    this.jigIndex = jigIndex
    this.lock = lock
  }

  exec (vm) {
    vm.lockJig(this.jigIndex, this.lock)
  }
}
