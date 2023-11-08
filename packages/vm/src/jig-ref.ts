import {WasmContainer} from './wasm-container.js';
import {Lock} from "./locks/lock.js";
import {Externref, getObjectMemLayout, getTypedArrayForPtr, Internref} from "./memory.js";
import {Pointer} from "@aldea/core";
import {AbiClass} from "./abi-helpers/abi-helpers/abi-class.js";

export class JigRef  {
  ref: Internref;
  classIdx: number;
  package: WasmContainer;
  origin: Pointer;
  latestLocation: Pointer;
  lock: Lock;

  constructor (ref: Internref, classIdx: number, module: WasmContainer, origin: Pointer, latestLocation: Pointer, lock: Lock) {
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
    return this.classAbi().name
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
    const abiNode = this.package.abi.exportedByIdx(this.classIdx).get().toAbiClass()
    const fieldNode = abiNode.fieldByName(fieldName).get()
    const layout = getObjectMemLayout(abiNode.fields)
    const TypedArray = getTypedArrayForPtr(fieldNode.type)
    const mem32 = new TypedArray(this.package.memory.buffer, this.ref.ptr)
    const { align, offset } = layout[fieldName]

    mem32[offset >>> align] = this.package.insertValue(propValue, fieldNode.type)
  }

  classAbi(): AbiClass {
    return this.package.abi.exportedByIdx(this.classIdx).get().toAbiClass()
  }

  static isJigRef(obj: Object): boolean {
    // This is a little hack to avoid having issues when 2 different builds are used at the same time.
    return obj instanceof JigRef || obj.constructor.name === 'JigRef'
  }
}
