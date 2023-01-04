import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";
import {LockType} from "../wasm-instance.js";
import {Pointer} from "@aldea/sdk-js";

export class JigLock implements Lock {
  private origin: Pointer;

  constructor (ownerOrigin: Pointer) {
    this.origin = ownerOrigin
  }

  serialize (): any {
    return {
      type: this.typeNumber(),
      data: this.origin.toBytes()
    }
  }

  isOpen (): boolean {
    return false
  }

  acceptsExecution(context: TxExecution): boolean {
    return context.stackTop() && context.stackTop().equals(this.origin);
  }

  canBeChangedBy(context: TxExecution): boolean {
    return this.acceptsExecution(context);
  }

  typeNumber(): number {
    return LockType.CALLER;
  }

  data(): Uint8Array {
    return this.origin.toBytes();
  }
}
