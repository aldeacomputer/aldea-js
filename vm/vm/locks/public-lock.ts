// import { ExecutionError } from '../errors.js'
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";

export class PublicLock implements Lock {
  constructor () {}

  serialize (): any {
    return {
      type: 'PublicLock'
    }
  }

  isOpen (): boolean {
    return false
  }

  acceptsExecution(_context: TxExecution): boolean {
    return true;
  }

  canBeChangedBy(context: TxExecution): boolean {
    return false;
  }
}
