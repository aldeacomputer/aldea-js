import {Address, Pointer} from "@aldea/core";
import { ExecutionError } from '../errors.js'
import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Option} from "../support/option.js";
import {SerializedLock} from "./serialized-lock.js";

export class NoLock implements Lock {
  constructor () {}

  serialize (): SerializedLock {
    throw new ExecutionError('a NoLock cannot be serialized')
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

  data(): Uint8Array {
    return new Uint8Array(0);
  }

  acceptsChangeFrom(_callerOrigin: Pointer, _context: TxExecution): boolean {
    return true;
  }

  address(): Option<Address> { return Option.none() }
}
