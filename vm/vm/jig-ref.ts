import { PermissionError } from './errors.js'
import { WasmInstance } from './wasm-instance.js';
import {Lock} from "./locks/lock.js";
import {UserLock} from "./locks/user-lock.js";
import {CBOR, Sequence} from "cbor-redux";

// export type JigPointer = {
//   value: number
// }

export class JigPointer {
  name: string;
  ptr: number;

  constructor(name: string, ptr: number) {
    this.name = name
    this.ptr = ptr
  }
}

export class JigRef {
  ref: JigPointer;
  className: string;
  module: WasmInstance;
  origin: string;
  lock: Lock;

  constructor (ref: JigPointer, className: string, module: WasmInstance, origin: string, lock: Lock) {
    this.ref = ref
    this.className = className
    this.module = module
    this.origin = origin
    this.lock = lock
  }

  sendMessage (methodName: string, args: Uint8Array[] , caller: string): Uint8Array {
    if (!this.lock.checkCaller(caller)) {
      throw new PermissionError(`jig ${this.origin} does not accept messages from ${caller}`)
    }
    return this.module.instanceCall(this.ref, this.className, methodName, args)
  }

  setOwner (newLock: Lock) {
    this.lock = newLock
  }

  open (key: Uint8Array): void {
    const lock = this.lock
    if (!(lock instanceof UserLock)) {
      throw new Error('expected to be a user lock')
    } else {
      const userLock = lock as UserLock
      userLock.open(key)
    }
  }

  close (newLock: Lock) {
    this.lock = newLock
  }

  serialize(): Uint8Array {
    // const seq = Sequence.from(this.getState(name, ref))
    // return CBOR.encode(seq)
    // return
    return new Uint8Array(0)
  }
}
