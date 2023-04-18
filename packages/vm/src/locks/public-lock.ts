// import { ExecutionError } from '../errors.js'
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Address, Pointer} from "@aldea/sdk-js";
import {Option} from "../support/option.js";
import {SerializedLock} from "./serialized-lock.js";

export class PublicLock implements Lock {
  constructor () {}

  serialize (): SerializedLock {
    return new SerializedLock(this.typeNumber(), this.data())

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

  address(): Option<Address> { return Option.none() }
}
