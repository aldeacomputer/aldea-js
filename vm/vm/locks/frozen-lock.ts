import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";

export class FrozenLock implements Lock {
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
    return false;
  }

  canBeChangedBy(context: TxExecution): boolean {
    return false;
  }

  typeNumber(): number {
    return LockType.FROZEN;
  }
}
