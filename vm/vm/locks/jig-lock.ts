import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Location} from "@aldea/sdk-js";

export class JigLock implements Lock {
  private origin: Location;

  constructor (ownerOrigin: Location) {
    this.origin = ownerOrigin
  }

  serialize (): any {
    return {
      type: 'JigLock',
      data: { origin: this.origin.toString() }
    }
  }

  isOpen (): boolean {
    return false
  }

  acceptsExecution(context: TxExecution): boolean {
    return context.stackTop().equals(this.origin);
  }

  canBeChangedBy(context: TxExecution): boolean {
    return this.acceptsExecution(context);
  }

  typeNumber(): number {
    return LockType.CALLER;
  }
}
