import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Address, Pointer} from "@aldea/sdk-js";
import {Option} from "../support/option.js";

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

  data(): Uint8Array {
    return new Uint8Array(0);
  }

  acceptsChangeFrom(callerOrigin: Pointer, context: TxExecution): boolean {
    return false;
  }

  address(): Option<Address> { return Option.none() }
}
