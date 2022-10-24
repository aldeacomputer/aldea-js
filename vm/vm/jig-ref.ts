import { PermissionError } from './errors.js'
import {MethodResult, WasmInstance} from './wasm-instance.js';
import {Lock} from "./locks/lock.js";
import {Internref} from "./memory.js";
import {TxExecution} from "./tx-execution.js";

export class JigRef {
  ref: Internref;
  className: string;
  module: WasmInstance;
  origin: string;
  lock: Lock;

  constructor (ref: Internref, className: string, module: WasmInstance, origin: string, lock: Lock) {
    this.ref = ref
    this.className = className
    this.module = module
    this.origin = origin
    this.lock = lock
  }

  sendMessage (methodName: string, args: any[] , context: TxExecution): MethodResult {
    if (!this.lock.acceptsExecution(context)) {
      throw new PermissionError(`jig ${this.origin} does not accept messages from ${context.stackTop()}`)
    }
    return this.module.instanceCall(this, this.className, methodName, args)
  }

  get originBuf (): Buffer {
    return Buffer.from(this.origin)
  }

  changeLock (newLock: Lock) {
    this.lock = newLock
  }

  close (newLock: Lock) {
    this.lock = newLock
  }

  serialize(): ArrayBuffer {
    return this.module.extractState(this.ref, this.className)
  }
}
