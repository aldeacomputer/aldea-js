import { PermissionError } from "./errors.js"

export class JigRef {
  constructor (ref, className, module, origin, lock) {
    this.ref = ref
    this.className = className
    this.module = module
    this.origin = origin
    this.lock = lock
  }

  sendMessage (methodName, args, caller) {
    if (!this.lock.checkCaller(caller)) {
      throw new PermissionError(`jig ${this.origin} does not accept messages from ${caller}`)
    }
    this.module.instanceCall(this.ref, this.className, methodName, args)
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
