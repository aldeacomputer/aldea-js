import {Lock} from "./lock.js";
import {TxExecution} from "../tx-execution.js";

export class JigLock implements Lock {
  private origin: string;

  constructor (ownerOrigin: string) {
    this.origin = ownerOrigin
  }

  serialize (): any {
    return {
      type: 'JigLock',
      data: { origin: this.origin }
    }
  }

  isOpen (): boolean {
    return false
  }

  acceptsExecution(context: TxExecution): boolean {
    return context.stackTop() === this.origin;
  }
}
