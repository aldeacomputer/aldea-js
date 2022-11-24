import {WasmInstance} from './wasm-instance.js';
import {Lock} from "./locks/lock.js";
import {Internref} from "./memory.js";
import {Location} from "@aldea/sdk-js";

export class JigRef  {
  ref: Internref;
  className: string;
  module: WasmInstance;
  origin: Location;
  lock: Lock;

  get name (): string {
    return this.className
  }

  constructor (ref: Internref, className: string, module: WasmInstance, origin: Location, lock: Lock) {
    this.ref = ref
    this.className = className
    this.module = module
    this.origin = origin
    this.lock = lock
  }

  // sendMessage (methodName: string, args: any[] , context: TxExecution): MethodResult {
  //   if (!this.lock.acceptsExecution(context)) {
  //     throw new PermissionError(`jig ${this.origin} does not accept message "${methodName}" from ${context.stackTop()}`)
  //   }
  //   return {mod: null, value: null, node: null}
  //   // return context.callInstanceMethod(this, methodName, args)
  // }

  get originBuf (): ArrayBuffer {
    return this.origin.toBuffer()
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
