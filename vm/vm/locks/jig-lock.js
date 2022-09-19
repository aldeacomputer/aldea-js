import { PermissionError } from "../errors.js"

export class JigLock {
  constructor (ownerOrigin) {
    this.origin = ownerOrigin
  }

  open (_key) {
    throw new PermissionError('jig locks can only by used by the owner jig.')
  }

  serialize () {
    return {
      type: 'JigLock',
      data: { origin: this.origin }
    }
  }

  isOpen () {
    return false
  }

  checkCaller (caller) {
    return caller === this.origin
  }
}
