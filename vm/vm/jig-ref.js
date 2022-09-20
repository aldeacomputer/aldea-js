import { PermissionError } from "./errors.js"

export class JigRef {
  constructor (ref, module, origin, lock) {
    this.ref = ref
    this.module = module
    this.origin = origin
    this.lock = lock
  }

  sendMessage (methodName, args, caller) {
    if (!this.lock.checkCaller(caller)) {
      throw new PermissionError(`jig ${this.origin} does not accept messages from ${caller}`)
    }
    this.module.instanceCall(this.ref, methodName, args)
  }

  setOwner (newLock) {
    this.lock = newLock
  }

  open (key) {
    this.owner = this.lock.open(key)
  }

  close (newLock) {
    this.lock = newLock
  }
}
