// import { ExecutionError } from '../errors.js'
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Pointer} from "@aldea/sdk-js";

export class PublicLock implements Lock {
  constructor () {}

  serialize (): any {
    return {
      type: this.typeNumber(),
      data: new Uint8Array(0)
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

  typeNumber(): number {
    return LockType.ANYONE;
  }

  data(): Uint8Array {
    return new Uint8Array(0);
  }

  acceptsChangeFrom(_callerOrigin: Pointer, _context: TxExecution): boolean {
    return false;
  }
}
