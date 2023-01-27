import {WasmInstance} from './wasm-instance.js';
import {Lock} from "./locks/lock.js";
import {Externref, Internref} from "./memory.js";
import {Pointer} from "@aldea/sdk-js";

export class JigRef  {
  ref: Internref;
  classIdx: number;
  package: WasmInstance;
  origin: Pointer;
  lock: Lock;

  constructor (ref: Internref, classIdx: number, module: WasmInstance, origin: Pointer, lock: Lock) {
    this.ref = ref
    this.classIdx = classIdx
    this.package = module
    this.origin = origin
    this.lock = lock
  }

  get originBuf (): ArrayBuffer {
    return this.origin.toBytes()
  }

  changeLock (newLock: Lock) {
    this.lock = newLock
  }

  close (newLock: Lock) {
    this.lock = newLock
  }

  className(): string {
    return this.package.abi.exports[this.classIdx].code.name
  }

  asChildRef(): Uint8Array {
    return this.origin.toBytes()
  }

  asExtRef() {
    return new Externref(this.className(), this.origin.toBytes());
  }

  outputObject(): any {
    return {
      origin: this.origin.toBytes(),
      location: this.origin.toBytes(),
      classPtr: this.classPtr().toBytes()
    }
  }

  classPtr(): Pointer {
    return new Pointer(this.package.id, this.classIdx)
  }

  lockObject() {
    return {
      origin: this.origin.toBytes(),
      type: this.lock.typeNumber(),
      data: this.lock.data()
    }
  }
}
