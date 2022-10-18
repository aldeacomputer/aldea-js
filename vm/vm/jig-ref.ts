import { PermissionError } from './errors.js'
import {MethodResult, WasmInstance} from './wasm-instance.js';
import {Lock} from "./locks/lock.js";
import {UserLock} from "./locks/user-lock.js";
import {Internref} from "./memory.js";


// export type JigPointer = {
//   value: number
// }

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

  // getPropValue (propName: any): any {
  //   const [expName, fieldName] = propStr.split('.')
  //   const obj = findExportedObject(this.abi, expName, `unknown export: ${expName}`)
  //   const field = findObjectField(obj, fieldName, `unknown field: ${fieldName}`)
  //
  //   const offsets = getObjectMemLayout(obj)
  //   const { offset, align } = offsets[field.name]
  //   const TypedArray = getTypedArrayConstructor(field.type)
  //   const val = new TypedArray(this.memory.buffer)[ref.ptr + offset >>> align]
  //   return liftValue(this, field.type, val)
  //
  //   // propStr: string, ref: Internref
  // }

  sendMessage (methodName: string, args: any[] , caller: string): MethodResult {
    if (!this.lock.checkCaller(caller)) {
      throw new PermissionError(`jig ${this.origin} does not accept messages from ${caller}`)
    }
    return this.module.instanceCall(this, this.className, methodName, args)
  }

  get originBuf (): Buffer {
    return Buffer.from(this.origin)
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

  serialize(): ArrayBuffer {
    return this.module.extractState(this.ref, this.className)
  }
}
