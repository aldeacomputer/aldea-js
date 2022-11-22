import { ExecutionError } from '../errors.js'
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";

export class NoLock implements Lock {
  constructor () {}

  serialize (): string {
    throw new ExecutionError('NoLocks cannot be serialized')
  }

  isOpen (): boolean {
    return true
  }

  acceptsExecution(_context: TxExecution): boolean {
    return true;
  }

  canBeChangedBy(_context: TxExecution): boolean {
    return true
  }

  typeNumber(): number {
    return LockType.NONE;
  }
}
