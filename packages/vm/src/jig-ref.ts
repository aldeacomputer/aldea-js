import {WasmInstance} from './wasm-instance.js';
import {Lock} from "./locks/lock.js";
import {Externref, getObjectMemLayout, getTypedArrayForPtr, Internref} from "./memory.js";
import {Pointer} from "@aldea/core";
import {ClassNodeWrapper} from "./abi-helpers/class-node-wrapper.js";

export class JigRef  {
  ref: Internref;
  classIdx: number;
  package: WasmInstance;
  origin: Pointer;
  latestLocation: Pointer;
  lock: Lock;

  constructor (ref: Internref, classIdx: number, module: WasmInstance, origin: Pointer, latestLocation: Pointer, lock: Lock) {
    this.ref = ref
    this.classIdx = classIdx
    this.package = module
    this.origin = origin
    this.latestLocation = latestLocation
    this.lock = lock
  }

  get originBuf (): ArrayBuffer {
    return this.origin.toBytes()
  }

  changeLock (newLock: Lock) {
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
      location: this.latestLocation.toBytes(),
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

  writeField(fieldName: string, propValue: any) {
    const abiNode = this.package.abi.classByName(this.className())
    const fieldNode = abiNode.fieldByName(fieldName)
    const layout = getObjectMemLayout(abiNode)
    const TypedArray = getTypedArrayForPtr(fieldNode.type)
    const mem32 = new TypedArray(this.package.memory.buffer, this.ref.ptr)
    const { align, offset } = layout[fieldName]

    mem32[offset >>> align] = this.package.insertValue(propValue, fieldNode.type)
  }

  classAbi(): ClassNodeWrapper {
    return this.package.abi.classByName(this.className())
  }

  static isJigRef(obj: Object): boolean {
    // This is a little hack to avoid having issues when 2 different builds are used at the same time.
    return obj instanceof JigRef || obj.constructor.name === 'JigRef'
  }
}
