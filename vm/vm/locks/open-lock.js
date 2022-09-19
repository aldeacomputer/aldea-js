export class OpenLock {
  constructor () {
    this.isOpen = true
  }

  open (key) {}

  checkCaller (_caller) {
    return true
  }
}
