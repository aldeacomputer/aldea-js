import { PermissionError } from "./permission-error.js"

export class JigRef {
  constructor (ref, module, origin, lock) {
    this.ref = ref
    this.module = module
    this.origin = origin
    this.lock = lock
  }

  sendMessage (methodName, args, caller) {
    if (this.lock !== null) {
      throw new PermissionError('jig is closed')
    }
    if (caller !== this.lock) {
      throw new PermissionError('bad permissions')
    }
    this.module.instanceCall(this.ref, methodName, args)
  }

  setOwner (newLock) {
    this.lock = newLock
  }

  open (key) {
    if (this.lock === null) {
      return
    }
    this.owner = this.lock.open(key)
  }

  close (newLock) {
    this.lock = newLock
  }
}
