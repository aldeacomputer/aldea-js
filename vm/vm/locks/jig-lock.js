export class JigLock {
  constructor (ownerOrigin) {
    this.origin = ownerOrigin
  }

  open (key) {
    if (key !== this.origin) {
      throw new Error()
    }
    return this.origin
  }
}
