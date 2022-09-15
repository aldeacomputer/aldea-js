import { PermissionError } from "./permission-error.js"

export class JigRef {
  constructor (ref, module, origin, owner) {
    this.ref = ref
    this.module = module
    this.origin = origin
    this.owner = owner
  }

  sendMessage (methodName, args, caller) {
    if (caller !== this.owner) {
      throw new PermissionError('bad permissions')
    }
    this.module.instanceCall(this.ref, methodName, args)
  }

  setOwner (newOwner) {
    this.owner = newOwner
  }

  close (newLock) {
    this.owner = newLock
  }
}
