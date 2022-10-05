import { PermissionError } from "../errors.js"
import {Lock} from "./lock.js";

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

  checkCaller (caller: string): boolean {
    return caller === this.origin
  }
}
