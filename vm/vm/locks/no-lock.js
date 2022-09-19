import { ExecutionError } from "../errors.js"

export class NoLock {
  constructor () {}

  checkCaller (_caller) {
    return true
  }

  serialize () {
    throw new ExecutionError('NoLocks cannot be serialized')
  }

  isOpen () {
    return true
  }
}
