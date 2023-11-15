import {BufWriter, Lock as CoreLock} from "@aldea/core";
import {TxExecution} from "../tx-execution.js";

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
}

export { CoreLock }
