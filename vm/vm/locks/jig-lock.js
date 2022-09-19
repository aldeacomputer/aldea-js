export class JigLock {
  constructor (ownerOrigin) {
    this.origin = ownerOrigin
    this.isOpen = false
  }

  open (key) {
    if (key !== this.origin) {
      throw new Error()
    }
    this.isOpen = true
    return this.origin
  }

  checkCaller (caller) {
    return caller.origin === this.origin
  }
}
