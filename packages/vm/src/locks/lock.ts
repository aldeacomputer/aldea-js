import {BufWriter, Lock as CoreLock} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";

/**
 * Basic interface for a lock.
 * In Aldea there are 5 types of lock:
 *
 * - `NoLock`: Provides no protection. Invalid at the end of a transaction.
 * - `AddressLock`: A lock that can be opened with the right signature.
 * - `JigLock`: A lock that can be opened only by the right jig.
 * - `PublicLock`: A lock that can be opened by anyone.
 * - `FrozenLock`: A lock that can never be opened.
 */
export abstract class Lock {
  abstract coreLock (): CoreLock;

  abstract assertOpen (param: TxExecution): void;

  serialize (origin: Uint8Array): Uint8Array {
    const w = new BufWriter()
    const coreLock = this.coreLock();
    w.writeBytes(origin)
    w.writeU32(coreLock.type)
    w.writeBytes(coreLock.data)
    return w.data
  }

  abstract canBeChanged (param: TxExecution): boolean;

  abstract canReceiveCalls (param: TxExecution): boolean;

  isOpen (): boolean {
    return false
  }
}

export { CoreLock }
