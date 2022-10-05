import { ExecutionError } from '../errors.js'
import {Lock} from "./lock.js";

export class NoLock implements Lock {
  constructor () {}

  checkCaller (caller: string): boolean {
    return true
  }

  serialize (): string {
    throw new ExecutionError('NoLocks cannot be serialized')
  }

  isOpen (): boolean {
    return true
  }
}
